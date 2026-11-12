import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, LAYOUTS, LAYOUT_KEY, readLayout, writeLayout } from '../../src/studio-layout.js';

const memory = (initial = {}) => { const data = { ...initial }; return { getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); } }; };

describe('studio layout preference (LAS-45)', () => {
  it('offers Classic plus A–D and defaults to Classic', () => {
    expect(LAYOUTS.map(layout => layout.id)).toEqual(['classic', 'a', 'b', 'c', 'd']);
    expect(readLayout(memory())).toBe(DEFAULT_LAYOUT);
  });
  it('round-trips a saved layout and ignores unknown values', () => {
    const storage = memory();
    expect(writeLayout('c', storage)).toBe(true);
    expect(readLayout(storage)).toBe('c');
    expect(readLayout(memory({ [LAYOUT_KEY]: 'nope' }))).toBe('classic');
  });
  it('falls back gracefully when storage throws', () => {
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    expect(readLayout(broken)).toBe('classic');
    expect(writeLayout('a', broken)).toBe(false);
  });
});
