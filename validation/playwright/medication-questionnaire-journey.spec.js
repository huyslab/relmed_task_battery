import { expect, test } from '@playwright/test';
import { defineTaskJourneyTest } from './support/journey-check.js';
import { TASKS } from './support/task-config.js';
import { patchWebkitTouchPoints, sanitize, trackPageErrors } from './support/helpers.js';

defineTaskJourneyTest('medication-questionnaire', TASKS.medication_questionnaire);

/**
 * The card scrolls vertically, which makes it clip horizontally too, so a focus ring on a
 * full-width control is only fully drawn if the card keeps a wide enough side gutter for it
 * (--medq-gutter in tasks/medication-questionnaire/styles.css). Runs wherever a keyboard is
 * the input, since that is where focus rings are seen.
 */
test('focus rings are not clipped at the card edges', async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await patchWebkitTouchPoints(page);

  const participantId = `journey_${sanitize(testInfo.project.name)}_medication-questionnaire-focus`;
  await page.goto(`${TASKS.medication_questionnaire.url}?participant_id=${participantId}`);

  const screen = page.locator('.medq-screen');
  await expect(screen).toBeVisible({ timeout: 15000 });
  test.skip(
    !(await screen.evaluate((el) => el.classList.contains('medq-keyboard'))),
    'focus rings only apply where a keyboard drives the questionnaire'
  );

  await page.keyboard.press('Enter'); // past the intro, onto the first question
  await expect(page.locator('#medq-text')).toBeVisible({ timeout: 15000 });

  const clearance = await page.evaluate(() => {
    const card = document.querySelector('.medq-screen');
    const cardBox = card.getBoundingClientRect();
    const ring =
      parseFloat(getComputedStyle(card).getPropertyValue('--medq-focus-ring')) +
      parseFloat(getComputedStyle(card).getPropertyValue('--medq-focus-offset'));

    return [...card.querySelectorAll('input, select, button')].map((control) => {
      const box = control.getBoundingClientRect();
      return {
        control: control.id || control.className,
        left: box.left - cardBox.left - ring,
        right: cardBox.right - box.right - ring,
      };
    });
  });

  expect(clearance.length, 'there should be controls on screen to check').toBeGreaterThan(0);
  for (const { control, left, right } of clearance) {
    expect(left, `${control} should leave room for its focus ring on the left`).toBeGreaterThanOrEqual(0);
    expect(right, `${control} should leave room for its focus ring on the right`).toBeGreaterThanOrEqual(0);
  }

  // A card that clips its ring horizontally would also be able to scroll sideways.
  const sideScroll = await screen.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(sideScroll, 'the card should not scroll sideways').toBeLessThanOrEqual(1);

  expect(errors, `no console/page errors expected, got:\n${errors.join('\n')}`).toEqual([]);
});
