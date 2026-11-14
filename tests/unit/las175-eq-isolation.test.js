import { describe, expect, test } from 'vitest';
import { defaultChain, editBand, setEqMode, validateChain } from '../../src/dsp/chain-params.js';

// LAS-175: an EQ edit must change `eq` only. Distinct, non-default Dynamics/Space/Limiter state.
const distinct = () => {
  const chain = defaultChain();
  chain.compressor = { ...chain.compressor, enabled: true, ratio: 3.5 };
  chain.space = { ...chain.space, enabled: true, mix: 27 };
  chain.limiter = { ...chain.limiter, ceiling: -2.5 };
  return validateChain(chain);
};
const others = p => ({ compressor: p.compressor, space: p.space, limiter: p.limiter, order: p.order });

describe('LAS-175 EQ edits leave unrelated modules untouched', () => {
  test.each([['link'], ['independent']])('editBand in %s mode changes eq only and does not mutate its input', mode => {
    const start = setEqMode(distinct(), mode);
    const snapshot = JSON.stringify(start);
    const next = editBand(start, 'left', 4, { enabled: true, type: 'bell', frequency: 300, gain: 3, q: 1 });
    expect(JSON.stringify(start)).toBe(snapshot);
    expect(others(next)).toEqual(others(start));
    expect(next.eq).not.toEqual(start.eq);
  });

  test('successive edits with different keys keep unrelated modules deep-equal', () => {
    const start = distinct();
    let chain = start;
    for (const [i, gain] of [[2, 1], [5, -2], [9, 4]]) chain = editBand(chain, 'left', i, { enabled: true, type: 'bell', frequency: 200 * (i + 1), gain, q: 1 });
    expect(others(chain)).toEqual(others(start));
  });
});
