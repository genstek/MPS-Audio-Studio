import { describe, expect, test } from 'vitest';
import { createChain, renderChain, spaceTailSeconds } from '../../src/dsp/chain.js';
import { CHAIN_ORDER, ChainParamsError, SPACE_PRESETS, defaultChain, parseChain, serializeChain, validateChain } from '../../src/dsp/chain-params.js';
import { preRollSeconds, renderSegment } from '../../src/dsp/segment-render.js';

// LAS-64: Space (reverb) with deterministic signal tests. Every measurement is computed from the
// rendered samples; nothing here is a listening judgement.
const only = space => {
  const p = defaultChain();
  return validateChain({ ...p, eq: { ...p.eq, enabled: false }, limiter: { ...p.limiter, enabled: false }, space: { ...p.space, ...space } });
};
const impulse = (seconds, rate) => { const x = new Float32Array(Math.round(seconds * rate)); x[0] = 1; return x; };
let seed = 7;
const noise = (frames, amplitude = 0.25) => Float32Array.from({ length: frames }, () => {
  seed = (seed * 16807) % 2147483647;
  return amplitude * ((seed / 2147483647) * 2 - 1);
});
const rms = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);

// RT60 below ~300 Hz from the impulse response: two one-pole low-passes, Schroeder backward
// integration, the −5 to −25 dB slope (T20) extrapolated to 60 dB.
function lowBandRt60(response, rate) {
  const a = Math.exp((-2 * Math.PI * 300) / rate);
  let y1 = 0, y2 = 0;
  const low = response.map(v => { y1 = (1 - a) * v + a * y1; y2 = (1 - a) * y1 + a * y2; return y2; });
  const energy = new Float64Array(low.length);
  let sum = 0;
  for (let i = low.length - 1; i >= 0; i--) { sum += low[i] * low[i]; energy[i] = sum; }
  const db = i => 10 * Math.log10(energy[i] / energy[0]);
  let from = -1, to = -1;
  for (let i = 0; i < low.length; i++) {
    if (from < 0 && db(i) <= -5) from = i;
    if (to < 0 && db(i) <= -25) { to = i; break; }
  }
  return ((to - from) / rate) * 3;
}

describe('LAS-64 Space settings', () => {
  test('schema v2 puts Space before the limiter; defaults are off; presets are valid', () => {
    expect(CHAIN_ORDER).toEqual(['eq', 'compressor', 'space', 'limiter']);
    expect(defaultChain().space).toEqual({ enabled: false, mix: 20, preDelay: 20, decay: 1.8, damping: 40 });
    for (const preset of Object.values(SPACE_PRESETS)) expect(() => only({ enabled: true, ...preset })).not.toThrow();
    const text = serializeChain(only({ enabled: true, ...SPACE_PRESETS.Hall }));
    expect(parseChain(text).space).toEqual({ enabled: true, ...SPACE_PRESETS.Hall });
  });

  test('version 1 settings are upgraded with Space off and otherwise unchanged; out-of-range values are refused', () => {
    const current = defaultChain();
    const { space, ...v1 } = { ...current, version: 1, order: ['eq', 'compressor', 'limiter'] }; // eslint-disable-line no-unused-vars
    const upgraded = validateChain(v1);
    expect(upgraded).toEqual(current);
    expect(() => validateChain({ ...v1, order: ['limiter', 'eq', 'compressor'] })).toThrow(ChainParamsError);
    for (const [field, value] of [['mix', 101], ['preDelay', -1], ['decay', 0.1], ['decay', 11], ['damping', 100.5]]) {
      expect(() => only({ [field]: value }), `${field} ${value}`).toThrow(ChainParamsError);
    }
  });
});

describe('LAS-64 Space processing', () => {
  test('bypassed Space is bit-identical, whatever its stored settings', () => {
    const input = [noise(48000), noise(48000)];
    const a = renderChain(defaultChain(), input, 48000).channels;
    const p = defaultChain();
    const b = renderChain(validateChain({ ...p, space: { enabled: false, mix: 100, preDelay: 200, decay: 10, damping: 0 } }), input, 48000).channels;
    expect(b[0]).toEqual(a[0]);
    expect(b[1]).toEqual(a[1]);
  });

  test('pre-delay: the first reverb sample arrives exactly after the pre-delay', () => {
    for (const [preDelay, rate] of [[0, 48000], [50, 48000], [120, 44100]]) {
      const out = renderChain(only({ enabled: true, mix: 100, preDelay }), [impulse(0.5, rate)], rate).channels[0];
      expect(out.findIndex(v => Math.abs(v) > 1e-9), `${preDelay} ms at ${rate} Hz`).toBe(Math.round((preDelay / 1000) * rate));
    }
  });

  test('decay: the measured low-frequency RT60 follows the setting within 10 % at 44.1, 48 and 96 kHz', () => {
    for (const rate of [44100, 48000, 96000]) {
      for (const decay of [0.5, 1.8, 5]) {
        const out = renderChain(only({ enabled: true, mix: 100, preDelay: 0, decay, damping: 0 }), [impulse(decay * 1.6 + 0.5, rate)], rate).channels[0];
        const measured = lowBandRt60(out, rate);
        expect(Math.abs(measured / decay - 1), `decay ${decay} s at ${rate} Hz measured ${measured.toFixed(3)} s`).toBeLessThan(0.1);
      }
    }
    // Nine renders up to 8.5 s at up to 96 kHz: ~1.7-1.9 s alone; the 5 s default is too tight under
    // contention (LAS-126). All three rates are kept; local budget only, tolerance unchanged.
  }, 30_000);

  test('damping shortens the high-frequency tail but not the low-frequency decay', () => {
    const rate = 48000;
    const tail = damping => renderChain(only({ enabled: true, mix: 100, preDelay: 0, decay: 2, damping }), [impulse(3, rate)], rate).channels[0];
    const highShare = x => {
      const late = x.subarray(rate, 2 * rate); // 1 to 2 s after the impulse
      const hp = late.map((v, n) => (n ? v - late[n - 1] : 0)); // first difference ≈ high-pass
      return rms(hp) / rms(late);
    };
    const bright = tail(0), dark = tail(80);
    expect(highShare(dark)).toBeLessThan(highShare(bright) * 0.5);
    expect(Math.abs(lowBandRt60(dark, rate) / lowBandRt60(bright, rate) - 1)).toBeLessThan(0.1);
  });

  test('stereo: a centred mono source gives decorrelated left/right reverb of equal level; a mono chain stays mono', () => {
    const rate = 48000;
    const x = noise(rate * 2);
    const [l, r] = renderChain(only({ enabled: true, mix: 100, preDelay: 0 }), [x, x.slice()], rate).channels;
    const late = [l.subarray(rate), r.subarray(rate)];
    const level = 20 * Math.log10(rms(late[0]) / rms(late[1]));
    expect(Math.abs(level)).toBeLessThan(1);
    let dot = 0; for (let n = 0; n < late[0].length; n++) dot += late[0][n] * late[1][n];
    const correlation = dot / (rms(late[0]) * rms(late[1]) * late[0].length);
    expect(Math.abs(correlation)).toBeLessThan(0.3);
    const mono = renderChain(only({ enabled: true, mix: 100 }), [x], rate);
    expect(mono.channels).toHaveLength(1);
    expect(rms(mono.channels[0].subarray(rate))).toBeGreaterThan(0.01);
  });

  test('mix: 0 % is the dry signal, 100 % the reverb alone; the dry path stays aligned', () => {
    const rate = 48000;
    const x = noise(rate);
    const dry = renderChain(only({ enabled: false }), [x, x.slice()], rate).channels;
    const zero = renderChain(only({ enabled: true, mix: 0 }), [x, x.slice()], rate).channels;
    for (let c = 0; c < 2; c++) for (let n = 0; n < x.length; n++) expect(Math.abs(zero[c][n] - dry[c][n])).toBeLessThan(1e-6);
    const wet = renderChain(only({ enabled: true, mix: 100, preDelay: 100 }), [x, x.slice()], rate).channels;
    expect(rms(wet[0].subarray(0, Math.round(0.1 * rate)))).toBe(0); // nothing before the pre-delay
  });

  test('no NaN, Infinity or runaway feedback with extreme settings and loud noise for 20 s', () => {
    const rate = 44100;
    const x = noise(rate * 20, 1);
    const out = renderChain(only({ enabled: true, mix: 100, preDelay: 200, decay: 10, damping: 0 }), [x, x.slice()], rate);
    let peak = 0, bad = 0;
    for (const channel of out.channels) for (const v of channel) { if (!Number.isFinite(v)) bad++; else peak = Math.max(peak, Math.abs(v)); }
    expect(bad).toBe(0);
    expect(out.meters.resets).toBe(0);
    expect(peak).toBeLessThan(8); // bounded (the limiter is off in this test)
    // The tail decays: 10 s of silence after the noise brings it 60 dB down.
    const tail = renderChain(only({ enabled: true, mix: 100, preDelay: 0, decay: 10, damping: 0 }), [x.subarray(0, rate)], rate, { tailFrames: rate * 11 }).channels[0];
    expect(20 * Math.log10(rms(tail.subarray(rate * 11, rate * 12)) / rms(tail.subarray(rate, rate * 2)))).toBeLessThan(-55);
    // 20 s stereo noise plus a 12 s tail render: ~2.1 s alone; the 5 s default is too tight under
    // contention (LAS-126). Local budget only; stability assertions unchanged.
  }, 30_000);

  test('parameter changes while running are smooth: no step larger than the signal itself makes', () => {
    const rate = 48000;
    const frames = rate * 2;
    const sine = Float32Array.from({ length: frames }, (_, n) => 0.5 * Math.sin((2 * Math.PI * 110 * n) / rate));
    const chain = createChain(only({ enabled: true, mix: 20, preDelay: 20, decay: 1.5, damping: 40 }), rate, 1);
    const out = new Float32Array(frames);
    const block = 128;
    for (let start = 0; start < frames; start += block) {
      if (start === rate / 2) chain.setParams(only({ enabled: true, mix: 80, preDelay: 150, decay: 6, damping: 10 }));
      if (start === rate) chain.setParams(only({ enabled: false, mix: 80, preDelay: 150, decay: 6, damping: 10 }));
      if (start === Math.round(1.5 * rate / block) * block) chain.setParams(only({ enabled: true, mix: 50, preDelay: 0, decay: 0.5, damping: 90 }));
      const count = Math.min(block, frames - start);
      const o = [new Float32Array(count)];
      chain.process([sine.subarray(start, start + count)], o, count);
      out.set(o[0], start);
    }
    // A 110 Hz sine at 0.5 changes by at most 0.0072 per sample; reverb adds some, a click far more.
    let worst = 0;
    for (let n = 1; n < frames; n++) worst = Math.max(worst, Math.abs(out[n] - out[n - 1]));
    expect(worst).toBeLessThan(0.05);
  });

  test('preview equals export: any block size gives identical samples, and the tail option only appends', () => {
    const rate = 44100;
    const x = [noise(rate), noise(rate)];
    const params = validateChain({ ...defaultChain(), space: { enabled: true, ...SPACE_PRESETS.Plate } });
    const a = renderChain(params, x, rate, { blockSize: 128 }).channels;
    const b = renderChain(params, x, rate, { blockSize: 997 }).channels;
    expect(b[0]).toEqual(a[0]);
    expect(b[1]).toEqual(a[1]);
    const tailFrames = Math.ceil(spaceTailSeconds(params) * rate);
    expect(spaceTailSeconds(params)).toBeCloseTo(SPACE_PRESETS.Plate.preDelay / 1000 + SPACE_PRESETS.Plate.decay, 12);
    const withTail = renderChain(params, x, rate, { tailFrames }).channels;
    expect(withTail[0]).toHaveLength(rate + tailFrames);
    expect(withTail[0].subarray(0, rate)).toEqual(a[0]);
    expect(rms(withTail[0].subarray(rate, rate + Math.round(0.2 * rate)))).toBeGreaterThan(1e-4); // the tail carries reverb
    expect(spaceTailSeconds(defaultChain())).toBe(0); // Space off: no tail, exports keep the source length
  });

  test('a section render keeps reverb that started before the section: the pre-roll covers pre-delay + decay', () => {
    const rate = 44100;
    const params = validateChain({ ...defaultChain(), space: { enabled: true, mix: 50, preDelay: 20, decay: 10, damping: 40 } });
    expect(preRollSeconds(params)).toBeGreaterThanOrEqual(spaceTailSeconds(params));
    // 1 s of 100 Hz, then silence: the 7–8 s section holds only the tail of that reverb.
    const tone = Float32Array.from({ length: 9 * rate }, (_, i) => (i < rate ? 0.5 * Math.sin((2 * Math.PI * 100 * i) / rate) : 0));
    const audio = [tone, tone.slice()];
    const whole = renderChain(params, audio, rate).channels.map(channel => channel.subarray(7 * rate, 8 * rate));
    const section = renderSegment(params, audio, rate, { start: 7, end: 8 }).channels;
    expect(rms(whole[0]), 'the whole render has reverb in the section').toBeGreaterThan(1e-4);
    for (const c of [0, 1]) {
      const worst = section[c].reduce((m, v, i) => Math.max(m, Math.abs(v - whole[c][i])), 0);
      expect(worst, `channel ${c}: section equals the whole render`).toBeLessThan(1e-6);
    }
  }, 30_000);

  test('reset() clears the tail at once: silence in gives silence out afterwards', () => {
    const rate = 48000;
    const chain = createChain(only({ enabled: true, mix: 100, decay: 8 }), rate, 2);
    const loud = noise(rate);
    const out = [new Float32Array(128), new Float32Array(128)];
    for (let start = 0; start < rate; start += 128) chain.process([loud.subarray(start, start + 128), loud.subarray(start, start + 128)], out, 128);
    chain.process([new Float32Array(128), new Float32Array(128)], out, 128);
    expect(rms(out[0])).toBeGreaterThan(1e-3); // still ringing
    chain.reset();
    let energy = 0;
    for (let i = 0; i < 20; i++) {
      chain.process([new Float32Array(128), new Float32Array(128)], out, 128);
      energy += rms(out[0]) + rms(out[1]);
    }
    expect(energy).toBe(0);
  });

  test('performance: real-time factor with Space on, measured (not asserted beyond real time)', () => {
    const rate = 48000;
    const x = [noise(rate * 10), noise(rate * 10)];
    const once = params => { const t = performance.now(); renderChain(params, x, rate); return (performance.now() - t) / 1000; };
    const best = params => Math.min(once(params), once(params), once(params)); // after warm-up, best of three
    const spaceOn = validateChain({ ...defaultChain(), space: { enabled: true, ...SPACE_PRESETS.Hall } });
    once(defaultChain()); once(spaceOn);
    const off = best(defaultChain());
    const on = best(spaceOn);
    console.log(`LAS-64 performance: 10 s stereo at 48 kHz, default chain ${off.toFixed(2)} s (${(10 / off).toFixed(1)}x real time), with Space ${on.toFixed(2)} s (${(10 / on).toFixed(1)}x real time)`);
    expect(10 / on).toBeGreaterThan(1);
  }, 120_000);
});
