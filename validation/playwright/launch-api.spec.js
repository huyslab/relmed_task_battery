import { expect, test } from '@playwright/test';

/**
 * experiment.html is reached by URL, so every launch parameter is untrusted input. These
 * checks pin what it does with a hostile or incomplete one: it must not execute what the URL
 * put in an error message, must not die before it can report anything, and must not offer a
 * bonus it has no rule to compute.
 *
 * Device-independent, so this runs once (see the `api` project in playwright.config.js).
 */

const LAUNCH = 'participant_id=launch-check&context=relmed&session=wk0';

test('an unknown task name is reported as text, not executed as markup', async ({ page }) => {
  // The registry echoes the requested name back in its error, so the name reaches the error
  // display. An <img> with a broken src is the cheapest probe: if the markup is ever parsed,
  // onerror fires, and the flag is set whether or not the element survives in the DOM.
  await page.addInitScript(() => { window.__xssFired = false; });

  const injected = '<img src=x onerror="window.__xssFired = true">';
  await page.goto(`/experiment.html?${LAUNCH}&task=${encodeURIComponent(injected)}`);

  await expect(page.locator('#display_element')).toContainText('Error Loading Experiment', {
    timeout: 15000,
  });

  expect(await page.evaluate(() => window.__xssFired), 'injected markup must never execute').toBe(false);
  expect(await page.locator('#display_element img').count(), 'no element from the URL').toBe(0);
  // The name is still shown, as literal text - the operator needs to see what was requested
  await expect(page.locator('#display_element')).toContainText(injected);
});

test('a malformed session_state does not stop the launch', async ({ page }) => {
  // Parsed at module scope, before runExperiment's try/catch exists: a throw here used to
  // leave a blank page with nothing rendered and no error shown.
  const warnings = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });

  await page.goto(`/experiment.html?${LAUNCH}&task=reversal&session_state=%7Bnot-json`);

  await expect
    .poll(() => page.evaluate(() => window.session_state), { timeout: 15000 })
    .toEqual({});
  expect(warnings.some((text) => text.includes('session_state')), 'the bad payload is announced').toBe(true);
  // The run proceeds rather than dying on the bad payload
  await expect(page.locator('#display_element')).not.toContainText('Error Loading Experiment');
});

test('a single task with no bonus rule runs without a bonus reveal', async ({ page }) => {
  // bonusRules covers reversal and vigour. Any other task once built a bonus trial with
  // max_bonus/min_prop_bonus undefined, and computeTotalBonus reached the participant as
  // "£NaN". The warning is emitted while the timeline is built, before the task runs.
  const warnings = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });

  await page.goto(`/experiment.html?${LAUNCH}&task=open_text`);

  await expect
    .poll(() => warnings.some((text) => text.includes('No bonus rule for task "open_text"')), { timeout: 15000 })
    .toBe(true);
  await expect(page.locator('#display_element')).not.toContainText('NaN');
});
