import { test, expect } from '@playwright/test';
import { captureShot, expectNoPageErrors, orientationOf, patchWebkitTouchPoints, sanitize, trackPageErrors } from './helpers.js';

// tasks/piggy-banks/vigour-instructions.js: FR = 5, demo unlocks "Continue" at shakeCount === FR + 1.
const DEMO_UNLOCK_TAPS = 6;
// tasks/piggy-banks/vigour-utils.js: VIGOUR_TRIALS ratios are 1, 8, or 16 presses-per-coin;
// this comfortably covers the largest with margin so a reward triggers regardless of trial.
const MAX_RATIO_TAPS = 20;
// tasks/reversal/styles.css: --animation-duration: 0.35s drives the coin-toss keyframes
// (top 60% -> 10% at 50% -> 100% at completion). Waiting half that lands on the 50% keyframe,
// where the coin is clearly visible mid-flight, rather than at its hidden start (t=0) or
// after it has fallen back off-screen (t=350ms+).
const REVERSAL_COIN_ANIMATION_MS = 350;

async function tapOrClick(locator, hasTouch) {
  if (hasTouch) {
    await locator.tap();
  } else {
    await locator.click();
  }
}

/**
 * Clicks through the touch-only orientation hint before task-specific instructions begin.
 * api/utils.js createTaskTimeline inserts this "Got it" trial after stimulus preloading;
 * desktop/non-touch skips it entirely.
 */
async function passOrientationHint(page, hasTouch) {
  if (hasTouch) {
    await page.getByRole('button', { name: 'Got it' }).click();
  }
}

/**
 * Drives a real (non-simulate) run of the vigour task far enough to deterministically
 * capture two moments simulate mode can't reliably land on: the static rules/instructions
 * text, and an actual coin-reward feedback moment.
 *
 * #piggy-container is reused by the interactive instructions demo, the "tap to begin"
 * confirmation, and the real trial - each screenshot below targets the one that matters at
 * that point in the timeline (see the readySelector comment in support/task-config.js for
 * why the real trial needs the `:not(:has(#instruction-container))` qualifier).
 */
async function vigourJourney(page, testInfo, hasTouch) {
  await passOrientationHint(page, hasTouch);

  // Interactive instructions demo: "Continue" only unlocks after DEMO_UNLOCK_TAPS taps.
  const demoPiggy = page.locator('#piggy-container');
  await expect(demoPiggy, 'instructions demo piggy bank should appear').toBeVisible({ timeout: 15000 });
  for (let i = 0; i < DEMO_UNLOCK_TAPS; i++) {
    await tapOrClick(demoPiggy, hasTouch);
  }
  await page.locator('#continue-button').click();

  // Static rules pages (jsPsychInstructions) - the actual instructions text.
  await expect(page.locator('#jspsych-instructions-next'), 'rules instructions page should appear').toBeVisible({
    timeout: 15000,
  });
  await captureShot(page, testInfo, 'vigour', 'instructions');
  await page.locator('#jspsych-instructions-next').click(); // page 2 of 2
  await page.locator('#jspsych-instructions-next').click(); // -> startConfirmation

  // "Tap the piggy bank to begin" confirmation screen.
  await expect(demoPiggy, 'start-confirmation piggy bank should appear').toBeVisible({ timeout: 15000 });
  await tapOrClick(demoPiggy, hasTouch);

  // Real trial: tap enough times to guarantee a reward regardless of this trial's ratio.
  const trialPiggy = page.locator('.experiment-wrapper:not(:has(#instruction-container)) #piggy-container');
  await expect(trialPiggy, 'real trial piggy bank should appear').toBeVisible({ timeout: 15000 });
  for (let i = 0; i < MAX_RATIO_TAPS; i++) {
    await tapOrClick(trialPiggy, hasTouch);
  }
  await expect(page.locator('.vigour_coin').first(), 'a coin should drop after enough presses').toBeVisible({
    timeout: 5000,
  });
  await captureShot(page, testInfo, 'vigour', 'feedback');
}

/**
 * Drives a real (non-simulate) run of the reversal task through to the static instructions
 * page and one real trial's coin-reveal feedback, branching on touch vs keyboard input the
 * same way the app itself does (task.js reversalInstructions / plugin-reversal.js).
 */
async function reversalJourney(page, testInfo, hasTouch) {
  await passOrientationHint(page, hasTouch);

  // Static rules pages (jsPsychInstructions) - wording differs by touch vs keyboard, both real.
  await expect(page.locator('#jspsych-instructions-next'), 'rules instructions page should appear').toBeVisible({
    timeout: 15000,
  });
  await captureShot(page, testInfo, 'reversal', 'instructions');
  await page.locator('#jspsych-instructions-next').click(); // page 2 of 2
  await page.locator('#jspsych-instructions-next').click(); // -> ready screen

  // Ready screen: tap either squirrel (touch) or press both arrow keys at once (keyboard).
  if (hasTouch) {
    await expect(page.locator('#rev-tap-left'), 'touch ready screen tap zone should appear').toBeVisible({
      timeout: 15000,
    });
    await page.locator('#rev-tap-left').tap();
  } else {
    await expect(page.locator('img[src*="2_finger_keys"]'), 'keyboard ready screen should appear').toBeVisible({
      timeout: 15000,
    });
    await Promise.all([page.keyboard.down('ArrowLeft'), page.keyboard.down('ArrowRight')]);
    await page.waitForTimeout(50); // hold both keys down together long enough to register as simultaneous
    await Promise.all([page.keyboard.up('ArrowLeft'), page.keyboard.up('ArrowRight')]);
  }

  // Real trial: respond once, then catch the coin reveal. triggerCoinAnimation sets
  // opacity:1 immediately on response, but the coin-toss CSS animation rises then falls
  // back past the bottom edge - screenshotting at t=0 catches it still at its hidden resting
  // position, and waiting past REVERSAL_COIN_ANIMATION_MS catches it already fallen off-screen.
  const stimulus = page.locator('.reversal-stimuli:has(#rev-coin-left)');
  await expect(stimulus, 'real trial stimulus should appear').toBeVisible({ timeout: 15000 });
  if (hasTouch) {
    await page.locator('#rev-tap-left').tap();
  } else {
    await page.keyboard.press('ArrowLeft');
  }
  await expect(page.locator('#rev-coin-left'), 'chosen-side coin should reveal after a response').toHaveCSS(
    'opacity',
    '1',
    { timeout: 5000 }
  );
  await page.waitForTimeout(REVERSAL_COIN_ANIMATION_MS / 2);
  await captureShot(page, testInfo, 'reversal', 'feedback');
}

const JOURNEYS = {
  vigour: vigourJourney,
  reversal: reversalJourney,
};

/**
 * Registers a real-interaction (non-simulate) walkthrough that captures the instructions
 * text and an in-task feedback/coin moment - checkpoints simulate mode can't reliably land
 * on (see support/render-check.js for the broad, fast, simulate-mode device-matrix check).
 * Runs on a small curated device subset (see playwright.config.js JOURNEY_DEVICES) since
 * real click/tap/keypress choreography is slower and more device-flow-specific than the
 * simulate-mode rendering check.
 */
export function defineTaskJourneyTest(taskKey, taskConfig) {
  // Most journeys capture instructions text and an in-task feedback moment; a task whose
  // walkthrough covers something else can name its own checkpoints via journeyTitle.
  const title = taskConfig.journeyTitle || `${taskKey} instructions and feedback render correctly`;

  test(title, async ({ page }, testInfo) => {
    const errors = trackPageErrors(page);
    await patchWebkitTouchPoints(page);

    const participantId = `journey_${sanitize(testInfo.project.name)}_${taskKey}`;
    await page.goto(`${taskConfig.url}?participant_id=${participantId}`);

    const hasTouch = await page.evaluate(() => navigator.maxTouchPoints > 0);

    // Unlike the rendering matrix (which deliberately checks both orientations), a journey
    // should exercise the task the way a real participant actually would: in ITS preferred
    // orientation. Phone projects default to portrait, which would otherwise hit the
    // rotate-overlay gate for reversal (landscape-preferred) and hang waiting for content
    // that's blocked behind it.
    const viewport = page.viewportSize();
    if (viewport && taskConfig.preferredOrientation && orientationOf(viewport) !== taskConfig.preferredOrientation) {
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
    }

    await JOURNEYS[taskKey](page, testInfo, hasTouch);

    expectNoPageErrors(errors);
  });
}
