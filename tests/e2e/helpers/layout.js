import { expect } from '@playwright/test';

// The mixer strips and their buttons (working modules since LAS-28; Space since LAS-64).
export const STRIP_BUTTONS = { EQ: 'Edit EQ', Dynamics: 'Edit dynamics', Limiter: 'Edit limiter', Space: 'Edit space' };

// The controls that must stay usable at every size (LAS-48; the LAS-51 essentials).
export function essentials(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  const master = page.getByRole('region', { name: 'Master', exact: true });
  const strips = page.getByRole('group', { name: 'Processing modules' });
  return [
    ...['Play', 'Pause', 'Stop'].map(name => [name, transport.getByRole('button', { name })]),
    ['status', transport.getByRole('status')],
    ['playback position', transport.getByRole('timer', { name: 'Playback position' })],
    ['Import/Replace WAV', tracks.getByRole('button', { name: 'Import WAV', exact: true })],
    ['Master level', master.getByRole('slider', { name: 'Master level' })],
    ['Export WAV', master.getByRole('button', { name: 'Export WAV' })],
    ...Object.entries(STRIP_BUTTONS).map(([name, button]) => [`${name} button`, strips.getByRole('button', { name: button })]),
    ['footer', page.locator('footer')],
  ];
}

// Desktop sizes (width >= 761, height >= 450) must show everything without page scrolling.
// Smaller sizes may scroll the page, but every essential control must be reachable, the page
// must never scroll sideways and button labels must not be cut off.
export async function checkLayout(page, label) {
  const { width, height } = page.viewportSize();
  const desktop = width >= 761 && height >= 450;
  const page_ = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
  }));
  expect(page_.width, `${label}: no horizontal page overflow`).toBeLessThanOrEqual(width);
  if (desktop) expect(page_.height, `${label}: no vertical page overflow`).toBeLessThanOrEqual(height);
  for (const [name, element] of essentials(page)) {
    if (!desktop) await element.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await expect(element, `${label}: ${name} fully visible`).toBeInViewport({ ratio: 1 });
    const uncovered = await element.evaluate(e => {
      const box = e.getBoundingClientRect();
      return e.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
    });
    expect(uncovered, `${label}: ${name} not covered`).toBe(true);
  }
  const cutLabels = await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter(button => button.scrollWidth > button.clientWidth + 1).map(button => button.textContent));
  expect(cutLabels, `${label}: button labels not cut off`).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
}
