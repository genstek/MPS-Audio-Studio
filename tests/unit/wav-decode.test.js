import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { makeWav } from '../fixtures/wav.js';

// Builds a WAV with the given format from per-channel sample values in [-1, 1).
function wav({ format = 1, bits = 16, rate = 48000, channels, extensible = false, extra = [] }) {
  const frames = channels[0].length;
  const width = bits / 8;
  const fmtLength = extensible ? 40 : 16;
  const data = Buffer.alloc(frames * channels.length * width);
  channels.forEach((channel, c) => channel.forEach((value, n) => {
    const at = (n * channels.length + c) * width;
    if (format === 3) return bits === 32 ? data.writeFloatLE(value, at) : data.writeDoubleLE(value, at);
    if (bits === 8) return data.writeUInt8(Math.round(value * 128) + 128, at);
    if (bits === 16) return data.writeInt16LE(Math.round(value * 32768), at);
    if (bits === 24) return data.writeIntLE(Math.round(value * 8388608), at, 3);
    return data.writeInt32LE(Math.round(value * 2147483648), at);
  }));
  const fmt = Buffer.alloc(fmtLength);
  fmt.writeUInt16LE(extensible ? 0xfffe : format, 0);
  fmt.writeUInt16LE(channels.length, 2);
  fmt.writeUInt32LE(rate, 4);
  fmt.writeUInt32LE(rate * channels.length * width, 8);
  fmt.writeUInt16LE(channels.length * width, 12);
  fmt.writeUInt16LE(bits, 14);
  if (extensible) {
    fmt.writeUInt16LE(22, 16);
    fmt.writeUInt16LE(bits, 18);
    fmt.writeUInt16LE(format, 24);
  }
  const chunk = (id, body) => Buffer.concat([Buffer.from(id, 'latin1'), Buffer.from(Uint32Array.of(body.length).buffer), body, Buffer.alloc(body.length % 2)]);
  const body = Buffer.concat([Buffer.from('WAVE', 'latin1'), ...extra, chunk('fmt ', fmt), chunk('data', data)]);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.from(Uint32Array.of(body.length).buffer), body]);
}

const arrayBuffer = buffer => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const values = [0, 0.5, -0.5, 0.25, -1];

describe('LAS-26 WAV decoding at the source sample rate', () => {
  test.each([
    ['8-bit PCM', { bits: 8 }, 1 / 128],
    ['16-bit PCM', { bits: 16 }, 1 / 32768],
    ['24-bit PCM', { bits: 24 }, 1 / 8388608],
    ['32-bit PCM', { bits: 32 }, 1 / 2147483648],
    ['32-bit float', { format: 3, bits: 32 }, 0],
    ['64-bit float', { format: 3, bits: 64 }, 0],
    ['extensible 24-bit PCM', { bits: 24, extensible: true }, 1 / 8388608],
    ['extensible 32-bit float', { format: 3, bits: 32, extensible: true }, 0],
  ])('%s keeps sample values, channels and rate', (_name, options, step) => {
    const decoded = decodeWav(arrayBuffer(wav({ ...options, rate: 44100, channels: [values, values.map(v => -v / 2)] })));
    expect(decoded).toMatchObject({ channels: 2, sampleRate: 44100, frames: values.length, bitsPerSample: options.bits });
    decoded.samples[0].forEach((sample, n) => expect(Math.abs(sample - values[n])).toBeLessThanOrEqual(step));
    decoded.samples[1].forEach((sample, n) => expect(Math.abs(sample + values[n] / 2)).toBeLessThanOrEqual(step));
  });

  test('a 96 kHz file is decoded at 96 kHz, not at a playback rate', () => {
    expect(decodeWav(arrayBuffer(wav({ rate: 96000, channels: [values] }))).sampleRate).toBe(96000);
  });

  test('chunks before fmt (such as LIST) are skipped and padding is respected', () => {
    const list = Buffer.concat([Buffer.from('LIST', 'latin1'), Buffer.from(Uint32Array.of(3).buffer), Buffer.from('abc'), Buffer.alloc(1)]);
    expect(decodeWav(arrayBuffer(wav({ channels: [values], extra: [list] }))).frames).toBe(values.length);
  });

  test('the project fixture decodes to its known tone', () => {
    const decoded = decodeWav(arrayBuffer(makeWav()));
    expect(decoded).toMatchObject({ channels: 1, sampleRate: 44100, frames: 132300, encoding: 'pcm', bitsPerSample: 16 });
    expect(decoded.samples[0].reduce((max, v) => Math.max(max, v), 0)).toBeCloseTo(1000 / 32768, 6);
  });

  test('the file bytes are not changed by decoding', () => {
    const bytes = arrayBuffer(makeWav({ seconds: 1, channels: 2 }));
    const before = createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
    decodeWav(bytes);
    expect(createHash('sha256').update(new Uint8Array(bytes)).digest('hex')).toBe(before);
  });

  test('the default fixture is byte-identical to the original LAS-TC002 tone', () => {
    expect(createHash('sha256').update(makeWav()).digest('hex')).toBe('2bfad1029bc4fd9a98ec1acc6f14d118148df557e6e0c1838b84d97298f0e63c');
  });

  const corrupt = (mutate, base = wav({ channels: [values] })) => {
    const copy = Buffer.from(base);
    mutate(copy);
    return arrayBuffer(copy);
  };
  test.each([
    ['too short', arrayBuffer(Buffer.alloc(20)), 'too short'],
    ['not RIFF', corrupt(b => b.write('RIFX', 0)), 'not a WAV'],
    ['compressed (ADPCM)', corrupt(b => b.writeUInt16LE(2, 20)), 'PCM and floating-point'],
    ['12-bit PCM', corrupt(b => b.writeUInt16LE(12, 34)), '12-bit PCM'],
    ['inconsistent block size', corrupt(b => b.writeUInt16LE(7, 32)), 'inconsistent'],
    ['data larger than the file', corrupt(b => b.writeUInt32LE(1e6, 40)), 'claims more bytes'],
    ['partial frame', corrupt(b => b.writeUInt32LE(9, 40)), 'whole sample frame'],
    ['no data chunk', arrayBuffer(Buffer.concat([wav({ channels: [values] }).subarray(0, 36), Buffer.from('junk', 'latin1'), Buffer.from(Uint32Array.of(10).buffer), Buffer.alloc(10)])), 'No audio data'],
    ['sample rate 4 kHz', corrupt(b => { b.writeUInt32LE(4000, 24); b.writeUInt32LE(8000, 28); }), 'sample rates'],
  ])('%s fails with a clear message', (_name, bytes, message) => {
    expect(() => decodeWav(bytes)).toThrow(message);
  });
});
