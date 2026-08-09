import { expect } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { TASKS } from './support/task-config.js';

defineTaskRenderingTest('self-report', {
  ...TASKS.self_report,
  extraChecks: async (page) => {
    const screen = page.locator('.srq-screen');

    // The plugin picks its controls from the device (plugin-self-report-item.js usesKeyboard).
    // Rather than re-deriving that decision here - browser emulation of pointer/hover is not
    // reliable enough across the matrix to assert against - check the screen commits to
    // exactly one mode.
    const mode = await screen.evaluate((el) => ({
      touch: el.classList.contains('srq-touch'),
      keyboard: el.classList.contains('srq-keyboard'),
    }));
    expect(
      mode.touch !== mode.keyboard,
      `screen should commit to exactly one input mode, got touch=${mode.touch} keyboard=${mode.keyboard}`
    ).toBe(true);

    // An item is answered by tapping an option, so every option on the scale has to be on
    // screen and big enough to hit. 44px is the smallest target both Apple's and Google's
    // guidelines accept.
    const options = page.locator('.srq-option');
    await expect(options, 'every option on the scale should be a button of its own').toHaveCount(4);
    for (const box of await Promise.all((await options.all()).map((option) => option.boundingBox()))) {
      expect(box, 'each option should have a bounding box (not display:none)').toBeTruthy();
      expect(box.height, 'each option should be big enough to tap').toBeGreaterThanOrEqual(44);
    }

    // The timeframe the item asks about is repeated on every item screen - without it the
    // item on its own cannot be answered.
    await expect(page.locator('.srq-context'), 'the timeframe should be shown above the item').toBeVisible();

    // The slide transition is driven by --srq-transition, set per trial from
    // transition_duration. Simulation mode zeroes it so tests don't wait on it; either way
    // the custom property must be set, which is what actually wires the transition up.
    const transition = await screen.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--srq-transition').trim()
    );
    expect(transition, '--srq-transition should be set on the screen').toMatch(/^\d+(\.\d+)?m?s$/);

    // Answers are committed as a screen leaves, so there must be nothing to go back with.
    await expect(
      page.getByRole('button', { name: /back|previous/i }),
      'the questionnaire must not offer a way back to an answered item'
    ).toHaveCount(0);
  },
});
