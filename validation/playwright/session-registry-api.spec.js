import { expect, test } from '@playwright/test';

/**
 * The session registry is the single point where a hosting site's label becomes the session
 * that drives a run - trial sequences, stimulus sets, rule variants. These checks pin the
 * resolution table and the two behaviours that depend on it: the run refuses to start on a
 * label it cannot resolve, and the resolved key reaches every task in a module.
 *
 * Device-independent, so this runs once (see the `api` project in playwright.config.js).
 */

test('session labels resolve to the canonical keys', async ({ page }) => {
  await page.goto('/experiment.html');

  const resolved = await page.evaluate(async () => {
    const { resolveSession } = await import('/api/index.js');
    return {
      ordinalFirst: resolveSession('Session 1'),
      ordinalFourth: resolveSession('Session 4'),
      week: resolveSession('Week 2'),
      weekLong: resolveSession('Week 24'),
      alias: resolveSession('Training'),
      rawKey: resolveSession('wk28'),
      messy: resolveSession('  session_2 '),
      unknown: resolveSession('Visit 3'),
      empty: resolveSession(''),
    };
  });

  expect(resolved).toEqual({
    ordinalFirst: 'wk0',
    ordinalFourth: 'wk24',
    week: 'wk2',
    weekLong: 'wk24',
    alias: 'screening',
    rawKey: 'wk28',
    messy: 'wk2',
    unknown: null,
    empty: null,
  });
});

test('every session entry carries what tasks read from it', async ({ page }) => {
  await page.goto('/experiment.html');

  const entries = await page.evaluate(async () => {
    const { SessionRegistry } = await import('/api/index.js');
    return Object.entries(SessionRegistry).map(([key, session]) => ({ key, ...session }));
  });

  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries) {
    expect(['screening', 'full'], `${entry.key} variant`).toContain(entry.variant);
    expect(['standard', 'restricted'], `${entry.key} resumePolicy`).toContain(entry.resumePolicy);
    expect(entry.stimulusSet, `${entry.key} stimulusSet`).toBeTruthy();
    expect(entry.name, `${entry.key} name`).toBeTruthy();
  }
});

test('an unrecognized session label stops the run before any task loads', async ({ page }) => {
  // Per-session trial sequences only. The pavlovian test sequence is a static ES import in
  // card-choosing/timeline.js, so it loads with the API on any page and isn't evidence a task
  // started.
  const sequenceRequests = [];
  page.on('request', (request) => {
    if (/trial1_(wk\d+|screening)\.js$/.test(request.url())) sequenceRequests.push(request.url());
  });

  await page.goto('/experiment.html?participant_id=session-check&context=relmed&module=full_battery&session=Visit%203');

  await expect(page.locator('#display_element')).toContainText('Unrecognized "session" URL parameter', {
    timeout: 15000,
  });
  // The error names what would have been accepted, derived from the registry itself
  await expect(page.locator('#display_element')).toContainText('screening, wk0');
  expect(sequenceRequests, 'no trial sequence should be fetched for an unusable session').toEqual([]);
});

test('the resolved session reaches every task in a module', async ({ page }) => {
  // "Session 2" resolves to wk2, so reversal inside the module must load the wk2 sequence -
  // the module itself declares no session.
  const sequenceRequest = page.waitForRequest((request) =>
    request.url().endsWith('/tasks/reversal/sequences/trial1_wk2.js')
  );

  await page.goto('/experiment.html?participant_id=session-check&context=relmed&module=full_battery&session=Session%202');
  await sequenceRequest;

  await expect.poll(() => page.evaluate(() => window.sessionKey)).toBe('wk2');
  // The label the site sent is preserved for REDCap; the key is recorded alongside it
  await expect.poll(() => page.evaluate(() => window.session)).toBe('Session 2');
});
