// Builds WAV files byte by byte, including deliberately broken ones, for upload tests.
export function chunk(id, body) {
  const header = Buffer.alloc(8);
  header.write(id, 0, 'latin1');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body, body.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
}

export function fmtChunk({ tag = 1, channels = 1, rate = 44100, bits = 16, blockAlign, byteRate, subTag }) {
  const align = blockAlign ?? channels * bits / 8;
  const body = Buffer.alloc(subTag === undefined ? 16 : 40);
  body.writeUInt16LE(subTag === undefined ? tag : 0xfffe, 0);
  body.writeUInt16LE(channels, 2);
  body.writeUInt32LE(rate, 4);
  body.writeUInt32LE(byteRate ?? rate * align, 8);
  body.writeUInt16LE(align, 12);
  body.writeUInt16LE(bits, 14);
  if (subTag !== undefined) {
    body.writeUInt16LE(22, 16);
    body.writeUInt16LE(bits, 18);
    body.writeUInt32LE(channels === 2 ? 3 : 4, 20);
    body.writeUInt16LE(subTag, 24);
  }
  return chunk('fmt ', body);
}

// Sine of the given amplitude (0-1) at 440 Hz in every channel.
export function samples({ channels = 1, rate = 44100, bits = 16, float = false, frames = 4410, amplitude = 0.5 }) {
  const bytes = bits / 8;
  const data = Buffer.alloc(frames * channels * bytes);
  for (let frame = 0; frame < frames; frame++) {
    const value = amplitude * Math.sin(2 * Math.PI * 440 * frame / rate);
    for (let channel = 0; channel < channels; channel++) {
      const offset = (frame * channels + channel) * bytes;
      if (float) data.writeFloatLE(value, offset);
      else if (bits === 16) data.writeInt16LE(Math.round(value * 32767), offset);
      else if (bits === 24) data.writeIntLE(Math.round(value * 8388607), offset, 3);
    }
  }
  return data;
}

export function riff(chunks, { sizeOverride } = {}) {
  const body = Buffer.concat([Buffer.from('WAVE', 'latin1'), ...chunks]);
  const header = Buffer.alloc(8);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(sizeOverride ?? body.length, 4);
  return Buffer.concat([header, body]);
}

export const wav = (format = {}, data = samples(format)) => riff([fmtChunk(format), chunk('data', data)]);
