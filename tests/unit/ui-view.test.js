import { describe, expect, it } from 'vitest';
import { VIEW_KEY, readStoredView, storeView } from '../../src/ui-view.js';

const memory = (initial = {}) => {
  const data = { ...initial };
  return { getItem: key => (key in data ? data[key] : null), setItem: (key, value) => { data[key] = String(value); }, data };
};
const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };

describe('LAS-45 view preference', () => {
  it('defaults to Classic', () => expect(readStoredView(memory())).toBe('classic'));
  it('ignores unknown stored values', () => expect(readStoredView(memory({ [VIEW_KEY]: 'neon' }))).toBe('classic'));
  it('round-trips the console choice', () => {
    const storage = memory();
    expect(storeView('console', storage)).toBe(true);
    expect(readStoredView(storage)).toBe('console');
  });
  it('falls back to Classic when storage is blocked', () => {
    expect(readStoredView(blocked)).toBe('classic');
    expect(storeView('console', blocked)).toBe(false);
  });
});
