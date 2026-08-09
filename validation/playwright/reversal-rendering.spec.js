import { expect, test } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { patchWebkitTouchPoints } from './support/helpers.js';
import { TASKS } from './support/task-config.js';

async function advanceToReversalTrial(page, participantId, useExperimentEntry = false) {
  const entryUrl = useExperimentEntry
    ? `/experiment.html?participant_id=${participantId}&context=relmed&task=reversal&session=Session%201`
    : `/examples/reversal.html?participant_id=${participantId}`;
  await page.goto(entryUrl);
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.locator('#jspsych-instructions-next').click();
  await page.locator('#jspsych-instructions-next').click();
  await page.locator('#rev-tap-left').tap();

  const stimulus = page.locator('.reversal-stimuli:has(#rev-coin-left)');
  await expect(stimulus, 'a real reversal trial should begin').toBeVisible({ timeout: 15000 });
  return stimulus;
}

async function dispatchParentControlMessage(page, message) {
  await page.evaluate((controlMessage) => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { message: controlMessage },
      origin: 'http://localhost:3000',
      source: window,
    }));
  }, message);
}

defineTaskRenderingTest('reversal', {
  ...TASKS.reversal,
  extraChecks: async (page, { hasTouch }) => {
    // plugin-reversal.js only renders .rev-tap-zone elements on touch-capable devices;
    // desktop stays keyboard-only (see reversal-touchscreen-pending memory).
    const tapZoneCount = await page.locator('.rev-tap-zone').count();
    if (hasTouch) {
      expect(tapZoneCount, 'touch devices should render tap zones for reversal').toBeGreaterThan(0);
    } else {
      expect(tapZoneCount, 'non-touch (desktop) devices should not render tap zones').toBe(0);
    }
  },
});

test('website Session 2 selects the wk2 reversal sequence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one project is sufficient for session mapping');

  const sequenceRequest = page.waitForRequest((request) =>
    request.url().endsWith('/tasks/reversal/sequences/trial1_wk2.js')
  );

  await page.goto('/experiment.html?participant_id=session-mapping-check&context=relmed&task=reversal&session=Session%202');
  await sequenceRequest;

  await expect.poll(() => page.evaluate(() => window.session)).toBe('Session 2');
  await expect(page.locator('#jspsych-content')).toBeAttached({ timeout: 15000 });
});

test('simulate query parameter preserves the participant ID', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one project is sufficient for simulation routing');

  await page.goto('/experiment.html?participant_id=flag-check&context=relmed&task=reversal&session=Session%201&simulate=1');

  await expect.poll(() => page.evaluate(() => window.simulating)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.participantID)).toBe('flag-check');
  await expect(page.locator('#jspsych-content'), 'the routed task should initialize').toBeAttached({ timeout: 15000 });
});

test('reversal preloads stimuli before showing the orientation hint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one touch project is sufficient for timeline ordering');

  await page.goto('/experiment.html?participant_id=timeline-order-check&context=relmed&task=reversal&session=Session%201');

  const firstTwoTrials = await page.evaluate(async () => {
    const { createTaskTimeline } = await import('/api/index.js');
    const timeline = await createTaskTimeline('reversal', { sequence: 'wk0' });
    return timeline.slice(0, 2).map((trial) => ({
      type: trial.type.info.name,
      trialphase: trial.data?.trialphase,
    }));
  });

  expect(firstTwoTrials).toEqual([
    { type: 'preload', trialphase: 'reversal_preload' },
    { type: 'html-button-response', trialphase: 'orientation_hint' },
  ]);
});

test('a narrow tablet pane is not treated as a phone rotation gate', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iPad Pro 11', 'one tablet project is sufficient for split-view coverage');

  await patchWebkitTouchPoints(page);
  await page.addInitScript(() => {
    // Playwright couples `screen` to manual viewport changes, whereas a real iPad keeps its
    // physical screen dimensions when the browser is placed in Split View or Stage Manager.
    Object.defineProperties(window.screen, {
      width: { value: 834, configurable: true },
      height: { value: 1194, configurable: true },
    });
  });
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/examples/reversal.html?participant_id=tablet-split-view');

  await expect(page.getByText(/hold your tablet in whichever orientation/i)).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Got it' }).click();

  await expect(page.locator('#rotate-overlay'), 'the portrait tablet pane should remain usable').toBeHidden();
  await expect(page.locator('#jspsych-instructions-next'), 'the task should advance normally in the narrow pane').toBeVisible();
});

test('reversal response time includes time spent rotating the phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one phone project is sufficient for RT coverage');

  await advanceToReversalTrial(page, 'rotation-rt-check');

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.locator('#rotate-overlay'), 'portrait should gate this landscape task').toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(900);

  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.locator('#rotate-overlay')).toBeHidden();
  await page.locator('#rev-tap-left').tap();
  await expect(page.locator('#rev-coin-left'), 'the first post-rotation response should still be accepted').toHaveCSS(
    'opacity',
    '1'
  );

  await expect.poll(() => page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').length
  )).toBeGreaterThan(0);
  const result = await page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').at(-1)
  );
  expect(result).toMatchObject({
    response: 'left',
    response_deadline_warning: false,
    wrong_orientation: true,
  });
  expect(result.rt, 'wall-clock RT should include time behind the rotate prompt').toBeGreaterThanOrEqual(800);
  expect(result.rt).toBeLessThan(3500);
});

test('a late reversal response cancels its response deadline', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one phone project is sufficient for deadline coverage');

  await advanceToReversalTrial(page, 'late-response-deadline-check');
  const reversalCount = await page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').length
  );

  // The example uses a 4-second response deadline and a 1.35-second reward animation.
  // Respond late enough that an uncancelled deadline would fire during the animation.
  await page.waitForTimeout(3200);
  await page.locator('#rev-tap-left').tap();
  await expect(page.locator('#rev-coin-left')).toHaveCSS('opacity', '1');
  await page.waitForTimeout(1000);
  await expect(page.locator('#rev-warning-temp'), 'an accepted response must not trigger the deadline warning').toHaveCount(0);

  await expect.poll(() => page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').length
  )).toBe(reversalCount + 1);
  const result = await page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').at(-1)
  );
  expect(result).toMatchObject({
    response: 'left',
    response_deadline_warning: false,
  });
});

test('parent and orientation pauses do not resume each other', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one phone project is sufficient for pause coordination');

  await advanceToReversalTrial(page, 'pause-owner-check', true);
  await page.evaluate(() => {
    const pauseExperiment = window.jsPsych.pauseExperiment.bind(window.jsPsych);
    const resumeExperiment = window.jsPsych.resumeExperiment.bind(window.jsPsych);
    window.pauseCallLog = [];
    window.jsPsych.pauseExperiment = () => {
      window.pauseCallLog.push('pause');
      pauseExperiment();
    };
    window.jsPsych.resumeExperiment = () => {
      window.pauseCallLog.push('resume');
      resumeExperiment();
    };
  });

  await dispatchParentControlMessage(page, 'pause_task');
  await expect.poll(() => page.evaluate(() => window.pauseCallLog)).toEqual(['pause']);

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.locator('#rotate-overlay')).toBeVisible();
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.locator('#rotate-overlay')).toBeHidden();
  expect(await page.evaluate(() => window.pauseCallLog)).toEqual(['pause']);

  await dispatchParentControlMessage(page, 'resume_task');
  await expect.poll(() => page.evaluate(() => window.pauseCallLog)).toEqual(['pause', 'resume']);

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.locator('#rotate-overlay')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.pauseCallLog)).toEqual(['pause', 'resume', 'pause']);

  await dispatchParentControlMessage(page, 'pause_task');
  await dispatchParentControlMessage(page, 'resume_task');
  expect(await page.evaluate(() => window.pauseCallLog)).toEqual(['pause', 'resume', 'pause']);

  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.locator('#rotate-overlay')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.pauseCallLog)).toEqual(['pause', 'resume', 'pause', 'resume']);
});

test('reversal records a missed response but waits to start the next trial while rotated', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one phone project is sufficient for pause coverage');

  await advanceToReversalTrial(page, 'rotation-deadline-check');
  const reversalCount = await page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').length
  );

  await page.setViewportSize({ width: 412, height: 915 });
  const overlay = page.locator('#rotate-overlay');
  await expect(overlay, 'portrait should gate this landscape task').toBeVisible();

  // The active trial keeps its normal 3.5-second response deadline. Input behind the overlay
  // is ignored, then pauseExperiment prevents the following trial from starting.
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').length
  ), { timeout: 8000 }).toBe(reversalCount + 1);

  const result = await page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').at(-1)
  );
  expect(result).toMatchObject({
    response: null,
    rt: null,
    response_deadline_warning: true,
    wrong_orientation: true,
  });

  const trialIndex = await page.evaluate(() => window.jsPsych.getProgress().current_trial_global);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.jsPsych.getProgress().current_trial_global)).toBe(trialIndex);
  await expect(page.locator('.reversal-stimuli'), 'no new trial should start behind the overlay').toHaveCount(0);

  await page.setViewportSize({ width: 915, height: 412 });
  await expect(overlay).toBeHidden();
  await expect(page.locator('.reversal-stimuli'), 'the next trial should start after resumeExperiment').toBeVisible({
    timeout: 5000,
  });
});
