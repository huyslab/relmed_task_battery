import { expect } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { TASKS } from './support/task-config.js';

defineTaskRenderingTest('medication-questionnaire', {
  ...TASKS.medication_questionnaire,
  extraChecks: async (page) => {
    const screen = page.locator('.medq-screen');

    // The plugin picks its controls from the device (plugin-medication-question.js
    // usesKeyboard). Rather than re-deriving that decision here - browser emulation of
    // pointer/hover is not reliable enough across the matrix to assert against - check the
    // screen is internally consistent: it commits to exactly one mode, and renders only the
    // controls that mode is supposed to have.
    const mode = await screen.evaluate((el) => ({
      touch: el.classList.contains('medq-touch'),
      keyboard: el.classList.contains('medq-keyboard'),
    }));
    expect(
      mode.touch !== mode.keyboard,
      `screen should commit to exactly one input mode, got touch=${mode.touch} keyboard=${mode.keyboard}`
    ).toBe(true);

    const keypadCount = await page.locator('.medq-keypad').count();
    const typedFieldCount = await page.locator('#medq-number').count();
    if (mode.keyboard) {
      expect(keypadCount, 'keyboard mode should never render the on-screen keypad').toBe(0);
    } else {
      expect(typedFieldCount, 'touch mode should never render the typed number field').toBe(0);
    }

    // The slide transition is driven by --medq-transition, set per trial from
    // transition_duration. Simulation mode zeroes it so tests don't wait on it; either way
    // the custom property must be set, which is what actually wires the transition up.
    const transition = await screen.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--medq-transition').trim()
    );
    expect(transition, '--medq-transition should be set on the screen').toMatch(/^\d+(\.\d+)?m?s$/);

    // Answers are committed as a screen leaves, so there must be nothing to go back with.
    await expect(
      page.getByRole('button', { name: /back|previous/i }),
      'the questionnaire must not offer a way back to an answered question'
    ).toHaveCount(0);
  },
});
