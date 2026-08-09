import { expect, test } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { TASKS } from './support/task-config.js';

async function advanceToVigourTrial(page, participantId, checkSecondaryButtons = false) {
  await page.goto(`/examples/vigour.html?participant_id=${participantId}`);
  await page.getByRole('button', { name: 'Got it' }).click();

  const piggy = page.locator('#piggy-container');
  await expect(piggy, 'the interactive instruction piggy should appear').toBeVisible({ timeout: 15000 });
  if (checkSecondaryButtons) {
    await piggy.dispatchEvent('pointerdown', { pointerType: 'mouse', isPrimary: true, button: 2 });
  }
  for (let i = 0; i < 5; i++) await piggy.tap();
  if (checkSecondaryButtons) {
    await expect(page.locator('#bottom-container'), 'a secondary button must not count toward the demo').toBeHidden();
  }
  await piggy.tap();
  await expect(page.locator('#bottom-container')).toBeVisible();
  await page.locator('#continue-button').click();

  await page.locator('#jspsych-instructions-next').click();
  await page.locator('#jspsych-instructions-next').click();
  await expect(piggy, 'the start-confirmation piggy should appear').toBeVisible({ timeout: 15000 });
  if (checkSecondaryButtons) {
    await piggy.dispatchEvent('pointerdown', { pointerType: 'pen', isPrimary: true, button: 2 });
    await expect(page.getByText(/tap the piggy bank to begin/i)).toBeVisible();
  }
  await piggy.tap();

  const trialPiggy = page.locator('.experiment-wrapper:not(:has(#instruction-container)) #piggy-container');
  await expect(trialPiggy, 'a real vigour trial should begin').toBeVisible({ timeout: 15000 });
  return trialPiggy;
}

defineTaskRenderingTest('vigour', {
  ...TASKS.vigour,
  extraChecks: async (page) => {
    const loaded = await page
      .locator('#piggy-bank')
      .evaluate((img) => img.complete && img.naturalWidth > 0);
    expect(loaded, 'piggy bank image should load and render (not a broken image)').toBe(true);
  },
});

test('vigour preloads stimuli before showing the orientation hint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one touch project is sufficient for timeline ordering');

  await page.goto('/experiment.html?participant_id=timeline-order-check&context=relmed&task=vigour&session=Session%201');

  const firstTwoTrials = await page.evaluate(async () => {
    const { createTaskTimeline } = await import('/api/index.js');
    const timeline = await createTaskTimeline('vigour');
    return timeline.slice(0, 2).map((trial) => ({
      type: trial.type.info.name,
      trialphase: trial.data?.trialphase,
    }));
  });

  expect(firstTwoTrials).toEqual([
    { type: 'preload', trialphase: 'vigour_preload' },
    { type: 'html-button-response', trialphase: 'orientation_hint' },
  ]);
});

test('vigour keeps running while the phone is being rotated', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7', 'one phone project is sufficient for timer coverage');

  await advanceToVigourTrial(page, 'rotation-duration-check');
  const trialIndex = await page.evaluate(() => window.jsPsych.getProgress().current_trial_global);

  await page.setViewportSize({ width: 915, height: 412 });
  const overlay = page.locator('#rotate-overlay');
  await expect(overlay, 'landscape should gate this portrait task').toBeVisible();
  await expect(overlay.locator('.rotate-msg-portrait')).toContainText('The task is still running');

  // Vigour trials last at most 7.49 seconds. Waiting longer than that should advance the
  // timeline even though the rotate warning remains visible, preventing an unintended rest.
  await page.waitForTimeout(7800);
  expect(await page.evaluate(() => window.jsPsych.getProgress().current_trial_global)).toBeGreaterThan(trialIndex);
  await expect(overlay, 'the warning should remain while the task continues behind it').toBeVisible();

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(overlay).toBeHidden();
});

test('vigour ignores non-primary pointer buttons in every tap stage', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7', 'one pointer-capable project is sufficient');

  const trialPiggy = await advanceToVigourTrial(page, 'primary-pointer-check', true);
  await trialPiggy.dispatchEvent('pointerdown', { pointerType: 'mouse', isPrimary: true, button: 2 });
  await trialPiggy.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: false, button: 0 });
  expect(await page.evaluate(() => window.jsPsych.getCurrentTrial().data.trial_presses())).toBe(0);

  await trialPiggy.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, button: 0 });
  await expect.poll(() => page.evaluate(() => window.jsPsych.getCurrentTrial().data.trial_presses())).toBe(1);
});
