import { describe, expect, it } from 'vitest';
import { defaultChain, editBand, parseChain, serializeChain, setEqMode } from '../../src/dsp/chain-params.js';
import { editGraphicGain, flattenGraphicBank, isGraphicBank, prepareGraphicBank } from '../../src/graphic-eq.js';
import { applyModulePreset, serializeModulePreset } from '../../src/module-presets.js';
import { renderChain } from '../../src/dsp/chain.js';

describe('LAS-75 graphic editing uses the existing parameter model', () => {
  it('requires explicit setup and preserves other modules and the fourteen extra bands', () => {
    const original = editBand(defaultChain(), 'left', 19, { enabled: true, gain: 3 });
    const before = serializeChain(original);
    expect(isGraphicBank(original.eq.left)).toBe(false);
    expect(() => editGraphicGain(original, 'left', 0, 3)).toThrow(/Set up/);
    const next = prepareGraphicBank(original, 'left');
    expect(isGraphicBank(next.eq.left)).toBe(true);
    expect(next.eq.right).toEqual(next.eq.left);
    expect(next.eq.left.slice(10)).toEqual(original.eq.left.slice(10));
    for (const module of ['compressor', 'space', 'limiter']) expect(next[module]).toEqual(original[module]);
    expect(serializeChain(original)).toBe(before);
  });

  it('edits only the selected channel when unlinked and survives settings and preset round-trips', () => {
    const original = setEqMode(defaultChain(), 'independent');
    const ready = prepareGraphicBank(original, 'right');
    const edited = editGraphicGain(ready, 'right', 5, 6);
    expect(edited.eq.left).toEqual(original.eq.left);
    expect(edited.eq.right[5].gain).toBe(6);
    expect(parseChain(serializeChain(edited))).toEqual(edited);
    const restored = applyModulePreset(serializeModulePreset(edited, 'eq'), defaultChain(), 'eq');
    expect(restored.eq).toEqual(edited.eq);
    expect(isGraphicBank(restored.eq.right)).toBe(true);
  });

  it('refuses incompatible parametric edits and invalid gains without changing settings', () => {
    const ready = prepareGraphicBank(defaultChain(), 'left');
    const changed = editBand(ready, 'left', 2, { type: 'high-pass' });
    expect(isGraphicBank(changed.eq.left)).toBe(false);
    expect(() => editGraphicGain(changed, 'left', 2, 1)).toThrow(/Set up/);
    for (const value of [NaN, Infinity, -12.1, 12.1]) expect(() => editGraphicGain(ready, 'left', 2, value)).toThrow(/between/);
    expect(() => editGraphicGain(ready, 'left', 10, 1)).toThrow(/Unknown/);
    expect(ready.eq.left[2].gain).toBe(0);
  });

  it('flattens only the graphic gains and retains the extra filters', () => {
    const ready = prepareGraphicBank(editBand(defaultChain(), 'left', 23, { enabled: true, gain: -2 }), 'left');
    const edited = editGraphicGain(ready, 'left', 0, -12);
    const flat = flattenGraphicBank(edited, 'left');
    expect(flat.eq.left.slice(0, 10).every(band => band.gain === 0 && band.enabled)).toBe(true);
    expect(flat.eq.left[23].gain).toBe(-2);
    expect(flat.eq.right).toEqual(flat.eq.left);
  });

  it('measures +6 dB at the 1 kHz band in both channels, and unity when EQ is bypassed', () => {
    const rate = 48000;
    const tone = Float32Array.from({ length: rate }, (_, i) => 0.05 * Math.sin(2 * Math.PI * 1000 * i / rate));
    const ready = prepareGraphicBank(defaultChain(), 'left');
    const edited = editGraphicGain(ready, 'left', 5, 6);
    // Isolate EQ from dynamics and latency so this verifies the filter bank's measured response.
    edited.limiter.enabled = false;
    const output = renderChain(edited, [tone, tone], rate).channels;
    const rms = values => Math.sqrt(values.slice(rate / 2).reduce((sum, v) => sum + v * v, 0) / (rate / 2));
    for (const channel of output) expect(20 * Math.log10(rms(channel) / rms(tone))).toBeCloseTo(6, 2);
    const bypassed = renderChain({ ...edited, eq: { ...edited.eq, enabled: false } }, [tone, tone], rate).channels;
    for (const channel of bypassed) expect(rms(channel)).toBeCloseTo(rms(tone), 6);
  });
});
