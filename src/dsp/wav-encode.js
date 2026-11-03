// PCM WAV encoder for export (LAS-28). 24-bit is written without dither (its rounding error is at
// −144 dBFS); 16-bit adds TPDF dither of ±1 LSB before rounding, from a seeded generator so the
// same render always gives the same file. Samples beyond full scale are clipped and counted.
export function encodeWav(channels, sampleRate, { bitDepth = 24, seed = 1 } = {}) {
  if (bitDepth !== 24 && bitDepth !== 16) throw new Error('Export supports 24-bit and 16-bit PCM.');
  const frames = channels[0].length;
  const width = bitDepth / 8;
  const blockAlign = channels.length * width;
  const dataSize = frames * blockAlign;
  const bytes = new ArrayBuffer(44 + dataSize + (dataSize % 2));
  const view = new DataView(bytes);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitDepth, true);
  text(36, 'data'); view.setUint32(40, dataSize, true);
  const scale = bitDepth === 24 ? 8388608 : 32768;
  const max = scale - 1, min = -scale;
  let state = seed >>> 0 || 1;
  const random = () => { // xorshift32 in [0, 1)
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
  let clipped = 0;
  let at = 44;
  for (let n = 0; n < frames; n++) {
    for (let c = 0; c < channels.length; c++, at += width) {
      let value = channels[c][n] * scale;
      if (bitDepth === 16) value += random() - random();
      value = Math.round(value);
      if (value > max) { value = max; clipped++; } else if (value < min) { value = min; clipped++; }
      if (bitDepth === 24) {
        view.setUint8(at, value & 0xff); view.setUint8(at + 1, (value >> 8) & 0xff); view.setUint8(at + 2, (value >> 16) & 0xff);
      } else {
        view.setInt16(at, value, true);
      }
    }
  }
  return { bytes, clippedSamples: clipped };
}
