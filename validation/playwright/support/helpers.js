import { expect } from '@playwright/test';
import path from 'node:path';
import { GATE_MIN_DIMENSION_THRESHOLD } from './task-config.js';

export const SCREENSHOT_DIR = path.join(process.cwd(), 'validation', 'playwright', 'screenshots');

export function orientationOf({ width, height }) {
  return width >= height ? 'landscape' : 'portrait';
}

/**
 * Re-derives whether the rotate-overlay gate should be active, from the same signals
 * the app itself uses (api/utils.js: touch capability plus the physical screen size gates
 * eligibility; the CSS media query then checks the current viewport orientation). Reading
 * real page signals here - rather than trusting Playwright project config - keeps this
 * accurate even if a project's `use` block is tweaked later.
 */
export function expectedGate(preferredOrientation, viewport, screen, hasTouch) {
  // A task that declares no preference is never gated: api/utils.js only builds the overlay
  // for 'portrait' or 'landscape'. Without this, a null preference would read as "always the
  // wrong orientation" and the gate would be expected on every phone.
  if (preferredOrientation !== 'portrait' && preferredOrientation !== 'landscape') return false;

  const minDimension = Math.min(screen.width, screen.height);
  const gateEligible = hasTouch && minDimension <= GATE_MIN_DIMENSION_THRESHOLD;
  const wrongOrientation = orientationOf(viewport) !== preferredOrientation;
  return gateEligible && wrongOrientation;
}

export function trackPageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

export function expectNoPageErrors(errors) {
  expect(errors, `no console/page errors expected, got:\n${errors.join('\n')}`).toEqual([]);
}

/** Screenshots the page to `validation/playwright/screenshots/<taskKey>/<project>--<label>.png` and attaches it to the test report. */
export async function captureShot(page, testInfo, taskKey, label) {
  const shotPath = path.join(SCREENSHOT_DIR, taskKey, `${sanitize(testInfo.project.name)}--${label}.png`);
  await page.screenshot({ path: shotPath });
  await testInfo.attach(`${testInfo.project.name} - ${label}`, { path: shotPath, contentType: 'image/png' });
}

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    overflow.scrollWidth,
    `page should not overflow horizontally (content clipped/cut off at the screen edge): ` +
      `scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`
  ).toBeLessThanOrEqual(overflow.clientWidth + 1); // +1px tolerance for subpixel rounding
}

export function sanitize(name) {
  return name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

/**
 * Playwright's WebKit engine (used for every iPhone/iPad device descriptor) emulates
 * 'ontouchstart' but does not propagate navigator.maxTouchPoints, even with hasTouch:true
 * in the project config (Chromium reports it correctly). The app's orientation-gate and
 * reversal's tap-zone rendering both key off `navigator.maxTouchPoints > 0`, so left
 * unpatched, real iOS touch behaviour is untestable under WebKit - not an app bug. Only
 * patches the observed gap; devices/engines that already report it correctly are untouched.
 */
export async function patchWebkitTouchPoints(page) {
  await page.addInitScript(() => {
    if ('ontouchstart' in window && navigator.maxTouchPoints === 0) {
      Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 5, configurable: true });
    }
  });
}
