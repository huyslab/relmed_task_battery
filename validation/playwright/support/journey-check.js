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

/**
 * Drives a real (non-simulate) run of the medication questionnaire through all five
 * questions, taking whichever path the plugin chose for this device: the on-screen keypad
 * and taps, or a typed field and the keyboard (plugin-medication-question.js usesKeyboard).
 * The answers entered here are read back out of jsPsych at the end, so this covers the
 * screens, the input-mode branch, and what each branch actually records.
 */
async function medicationQuestionnaireJourney(page, testInfo, hasTouch) {
  const screen = page.locator('.medq-screen');
  await expect(screen, 'the first screen should appear').toBeVisible({ timeout: 15000 });

  // Ask the page which branch it took rather than guessing from the device: emulated
  // pointer/hover media features are not a reliable stand-in for the real decision.
  const keyboardMode = await screen.evaluate((el) => el.classList.contains('medq-keyboard'));
  const advance = async () => {
    if (keyboardMode) {
      await page.keyboard.press('Enter');
    } else {
      await tapOrClick(page.locator('#medq-continue'), hasTouch);
    }
  };

  // Screens slide in by adding this class a frame after they are built; a screen stuck
  // without it would be invisible or mid-transition.
  await expect(screen, 'the screen should have slid in').toHaveClass(/medq-screen-in/, { timeout: 5000 });
  await captureShot(page, testInfo, 'medication-questionnaire', 'intro');
  await advance();

  // 1. Name of the medicine - typed on whichever keyboard the device has.
  const nameField = page.locator('#medq-text');
  await expect(nameField, 'the medicine name field should appear').toBeVisible({ timeout: 15000 });
  await expect(
    page.locator('#medq-continue'),
    'continue should stay disabled until the name has been entered'
  ).toBeDisabled();
  if (!keyboardMode) await nameField.tap();
  await nameField.fill('Sertraline');
  await expect(page.locator('#medq-continue'), 'continue should unlock once a name is entered').toBeEnabled();
  await advance();

  // 2. Strength of one pill - the keypad on a touchscreen, a typed field otherwise.
  const keypad = page.locator('.medq-keypad');
  const typedNumber = page.locator('#medq-number');
  if (keyboardMode) {
    await expect(typedNumber, 'keyboard mode should offer a typed number field').toBeVisible({ timeout: 15000 });
    await expect(keypad, 'keyboard mode should not render the keypad').toHaveCount(0);
    await typedNumber.fill('12a5');
    await expect(typedNumber, 'letters should be dropped as the number is typed').toHaveValue('125');
  } else {
    await expect(keypad, 'touch mode should offer the on-screen keypad').toBeVisible({ timeout: 15000 });
    await expect(typedNumber, 'touch mode should not render the typed number field').toHaveCount(0);
    await page.locator('.medq-key[data-key="1"]').tap();
    await page.locator('.medq-key[data-key="2"]').tap();
    await page.locator('.medq-key[data-key="9"]').tap();
    await page.locator('.medq-key[data-key="del"]').tap();
    await page.locator('.medq-key[data-key="5"]').tap();
    await expect(page.locator('#medq-keypad-value'), 'the keypad readout should track the keys pressed').toHaveText(
      '125'
    );
  }
  await captureShot(page, testInfo, 'medication-questionnaire', 'dose');
  await advance();

  // 3. Pills per day - take the "5 or more" option, which swaps this same screen for a
  // number entry rather than moving on.
  const options = page.locator('.medq-choice');
  await expect(options.first(), 'the pills-per-day options should appear').toBeVisible({ timeout: 15000 });
  await captureShot(page, testInfo, 'medication-questionnaire', 'options');
  if (keyboardMode) {
    await page.keyboard.press('5'); // number keys pick an option outright
    await expect(typedNumber, '"5 or more" should reveal a number entry').toBeVisible({ timeout: 5000 });
    await typedNumber.fill('7');
  } else {
    await options.last().tap();
    await expect(keypad, '"5 or more" should reveal the keypad').toBeVisible({ timeout: 5000 });
    await page.locator('.medq-key[data-key="7"]').tap();
  }
  await advance();

  // 4. Start date - day, month and year, each optional.
  await expect(page.locator('.medq-date'), 'the date selects should appear').toBeVisible({ timeout: 15000 });
  await page.locator('#medq-day').selectOption('3');
  await page.locator('#medq-month').selectOption('11');
  await page.locator('#medq-year').selectOption('2022');
  await captureShot(page, testInfo, 'medication-questionnaire', 'date');
  await advance();

  // 5. Other medicines - the yes/no gate, then the list built one item at a time.
  const yesButton = page.locator('#medq-list-yes');
  await expect(yesButton, 'the yes/no gate should appear').toBeVisible({ timeout: 15000 });
  if (keyboardMode) {
    await page.keyboard.press('1');
  } else {
    await yesButton.tap();
  }

  const listField = page.locator('#medq-list-input');
  await expect(listField, 'answering yes should reveal the list field').toBeVisible({ timeout: 5000 });
  for (const medicine of ['Ibuprofen', 'Metformin', 'Mistake']) {
    if (!keyboardMode) await listField.tap();
    await listField.fill(medicine);
    if (keyboardMode) {
      await page.keyboard.press('Enter'); // adds the item without leaving the screen
    } else {
      await page.locator('#medq-list-add').tap();
    }
  }
  await expect(page.locator('.medq-chip'), 'each added medicine should appear as a chip').toHaveCount(3);
  await tapOrClick(page.locator('.medq-chip').last().locator('.medq-chip-remove'), hasTouch);
  await expect(page.locator('.medq-chip'), 'removing a chip should drop that medicine').toHaveCount(2);
  await captureShot(page, testInfo, 'medication-questionnaire', 'list');
  await tapOrClick(page.locator('#medq-continue'), hasTouch);

  // What the run actually recorded. Answers are committed as each screen leaves, so this is
  // also where a screen that silently failed to record, or recorded twice, would show up.
  await expect(page.locator('#display_element'), 'the questionnaire should finish').toContainText(
    'Questionnaire complete',
    { timeout: 15000 }
  );
  const recorded = await page.evaluate(() =>
    window.jsPsych.data
      .get()
      .values()
      .map((trial) => ({
        name: trial.question_name,
        response: trial.response,
        input_mode: trial.input_mode,
      }))
  );

  expect(recorded, 'every question should be recorded exactly once, in order').toEqual([
    { name: 'medication_questionnaire_intro', response: null, input_mode: keyboardMode ? 'keyboard' : 'touch' },
    { name: 'medication_name', response: 'Sertraline', input_mode: keyboardMode ? 'keyboard' : 'touch' },
    { name: 'medication_dose_mg', response: 125, input_mode: keyboardMode ? 'keyboard' : 'touch' },
    { name: 'pills_per_day', response: 7, input_mode: keyboardMode ? 'keyboard' : 'touch' },
    {
      name: 'medication_start_date',
      response: { day: 3, month: 11, year: 2022 },
      input_mode: keyboardMode ? 'keyboard' : 'touch',
    },
    {
      name: 'other_medications',
      response: ['Ibuprofen', 'Metformin'],
      input_mode: keyboardMode ? 'keyboard' : 'touch',
    },
  ]);
}

/**
 * Drives a real (non-simulate) run of the self-report battery through every item of both
 * questionnaires, taking whichever path the plugin chose for this device: tapping the option,
 * or picking it with a number key (plugin-self-report-item.js usesKeyboard). The answers are
 * read back out of jsPsych at the end, so this covers the screens, the input-mode branch, and
 * that each item is recorded once, in order, with the option that was actually chosen.
 */
async function selfReportJourney(page, testInfo, hasTouch) {
  // tasks/self-report/questionnaires.js: PHQ-9 runs to 10 items (a consistency catch at 9),
  // GAD-7 to 8 (an infrequency catch at 7). Both use the same four-point frequency scale.
  const QUESTIONNAIRES = [
    { key: 'PHQ9', items: 10, catches: { 9: 'consistency' } },
    { key: 'GAD7', items: 8, catches: { 7: 'infrequency' } },
  ];

  const screen = page.locator('.srq-screen');
  await expect(screen, 'the first screen should appear').toBeVisible({ timeout: 15000 });

  // Ask the page which branch it took rather than guessing from the device: emulated
  // pointer/hover media features are not a reliable stand-in for the real decision.
  const keyboardMode = await screen.evaluate((el) => el.classList.contains('srq-keyboard'));

  // Screens slide in by adding this class a frame after they are built; a screen stuck
  // without it would be invisible or mid-transition.
  await expect(screen, 'the screen should have slid in').toHaveClass(/srq-screen-in/, { timeout: 5000 });

  /** Waits for a "something to read" screen carrying `prompt`, then takes its one way forward */
  const passMessage = async (prompt) => {
    await expect(page.locator('.srq-prompt'), 'the message screen should appear').toContainText(prompt, {
      timeout: 15000,
    });
    if (keyboardMode) {
      await page.keyboard.press('Enter'); // the continue button is focused on arrival
    } else {
      await tapOrClick(page.locator('#srq-continue'), hasTouch);
    }
  };

  await captureShot(page, testInfo, 'self-report', 'intro');
  await passMessage('short questionnaires about how you have been feeling');

  const expected = [];
  for (const questionnaire of QUESTIONNAIRES) {
    await passMessage('how often have you been bothered');

    for (let i = 0; i < questionnaire.items; i++) {
      // Only the progress label distinguishes one item screen from the next reliably, and
      // waiting on it is also what keeps this from answering the outgoing screen twice.
      await expect(page.locator('.srq-progress-label'), 'the item counter should track progress').toHaveText(
        `Question ${i + 1} of ${questionnaire.items}`,
        { timeout: 15000 }
      );

      const options = page.locator('.srq-option');
      await expect(options, 'the whole scale should be on screen').toHaveCount(4);

      // Cycle through the scale, so every option position is exercised at least twice
      const choice = i % 4;
      if (keyboardMode) {
        await page.keyboard.press(String(choice + 1)); // number keys pick an option outright
      } else {
        await options.nth(choice).tap();
      }

      expected.push({
        questionnaire: questionnaire.key,
        item_id: `${questionnaire.key}_Q${String(i + 1).padStart(2, '0')}`,
        response: choice,
        catch_type: questionnaire.catches[i + 1] || null,
        input_mode: keyboardMode ? 'keyboard' : 'touch',
      });

      if (i === 0) await captureShot(page, testInfo, 'self-report', `${questionnaire.key}-item`);
    }
  }

  // What the run actually recorded. Answers are committed as each screen leaves, so this is
  // also where an item that silently failed to record, or recorded twice, would show up.
  await expect(page.locator('#display_element'), 'the questionnaires should finish').toContainText(
    'Questionnaires complete',
    { timeout: 15000 }
  );
  const recorded = await page.evaluate(() =>
    window.jsPsych.data
      .get()
      .values()
      .filter((trial) => trial.item_id)
      .map((trial) => ({
        questionnaire: trial.questionnaire,
        item_id: trial.item_id,
        response: trial.response,
        catch_type: trial.catch_type,
        input_mode: trial.input_mode,
      }))
  );

  expect(recorded, 'every item should be recorded exactly once, in order, with the option chosen').toEqual(expected);
}

const JOURNEYS = {
  vigour: vigourJourney,
  reversal: reversalJourney,
  'medication-questionnaire': medicationQuestionnaireJourney,
  'self-report': selfReportJourney,
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
  // walkthrough covers something else (the questionnaire answers every question) can name
  // its own checkpoints via journeyTitle.
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
