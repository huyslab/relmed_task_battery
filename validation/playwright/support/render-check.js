import { expect, test } from '@playwright/test';
import {
  captureShot,
  expectedGate,
  expectNoHorizontalOverflow,
  expectNoPageErrors,
  patchWebkitTouchPoints,
  sanitize,
  trackPageErrors,
} from './helpers.js';

/**
 * Registers a single "does this task render correctly" test that runs once per device
 * project (see playwright.config.js). Behaviour branches on real page signals so the
 * same test body is correct for phones, tablets, and desktop without per-device cases:
 *  - Touch-capable + phone-sized physical screen + wrong orientation -> rotate-overlay gate is
 *    expected; assert it and screenshot it.
 *  - Otherwise -> the task should load and progress normally (jsPsych.simulate(), driven
 *    by "simulate" in participant_id, auto-advances instructions/trials); wait for the
 *    real task stimulus, assert it renders sanely, and screenshot it.
 */
export function defineTaskRenderingTest(taskKey, taskConfig) {
  test(`${taskKey} renders correctly`, async ({ page }, testInfo) => {
    const errors = trackPageErrors(page);
    const participantId = `simulate_${sanitize(testInfo.project.name)}_${taskKey}`;

    await patchWebkitTouchPoints(page);

    await page.goto(`${taskConfig.url}?participant_id=${participantId}`);

    const { width, height, screenWidth, screenHeight, maxTouchPoints } = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    }));
    const hasTouch = maxTouchPoints > 0;
    const gateExpected = expectedGate(
      taskConfig.preferredOrientation,
      { width, height },
      { width: screenWidth, height: screenHeight },
      hasTouch
    );

    if (gateExpected) {
      const overlay = page.locator('#rotate-overlay');
      await expect(overlay, 'rotate-overlay should block the task in the wrong orientation').toBeVisible({
        timeout: 15000,
      });
      await expect(
        page.locator(taskConfig.rotateMessageSelector),
        'the orientation-specific message should be the one shown'
      ).toBeVisible();

      await captureShot(page, testInfo, taskKey, 'rotate-gate');
    } else {
      const readyLocator = page.locator(taskConfig.readySelector);
      const stimulus = readyLocator.first();
      await expect(stimulus, `${taskConfig.readySelector} should appear once the task starts`).toBeVisible({
        timeout: 30000,
      });
      // Guards against readySelector becoming too broad and silently matching more than the
      // real trial (e.g. also matching a reused instructions/preview screen) - .first() alone
      // would keep passing on an ambiguous match instead of failing loudly.
      await expect(
        readyLocator,
        `${taskConfig.readySelector} should match exactly one element, not several`
      ).toHaveCount(1);

      // jsPsych.simulate() keeps auto-advancing trials in the background (each trial's DOM
      // is torn down and rebuilt), so a single snapshot can land mid-transition between
      // trials. Retry the whole read-and-assert block, re-querying fresh each time, until it
      // lands on a fully-rendered, stable trial rather than treating a transient teardown as
      // a real rendering failure.
      await expect(async () => {
        const box = await stimulus.boundingBox();
        expect(box, `${taskConfig.readySelector} should have a bounding box (not display:none)`).toBeTruthy();
        expect(box.width, 'task stimulus should not be collapsed to zero width').toBeGreaterThan(0);
        expect(box.height, 'task stimulus should not be collapsed to zero height').toBeGreaterThan(0);

        await expect(page.locator('#rotate-overlay'), 'rotate-overlay must not cover the running task').toBeHidden();
        await expectNoHorizontalOverflow(page);

        if (taskConfig.extraChecks) {
          await taskConfig.extraChecks(page, { hasTouch });
        }

        await captureShot(page, testInfo, taskKey, 'in-task');
      }).toPass({ timeout: 10000, intervals: [200, 500] });
    }

    expectNoPageErrors(errors);
  });
}
