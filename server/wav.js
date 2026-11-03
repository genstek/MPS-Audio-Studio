import { closeSync, createReadStream, openSync, readSync } from 'node:fs';

// Bounded RIFF/WAVE inspection (LAS-23). Only chunk headers and the fmt chunk are read, so time and
// memory do not depend on the file's size or contents.
export const MAX_CHUNKS = 64;
const PCM = 1;
const FLOAT = 3;
const EXTENSIBLE = 0xfffe;

export class WavError extends Error {}

function readAt(fd, position, length) {
  const buffer = Buffer.alloc(length);
  const read = readSync(fd, buffer, 0, length, position);
  return buffer.subarray(0, read);
}

export function inspectWav(path, size) {
  const fd = openSync(path, 'r');
  try {
    if (size < 44) throw new WavError('This file is too short to be a WAV.');
    const header = readAt(fd, 0, 12);
    if (header.toString('latin1', 0, 4) !== 'RIFF' || header.toString('latin1', 8, 12) !== 'WAVE') {
      throw new WavError('This file is not a WAV (RIFF/WAVE header missing).');
    }
    const riffEnd = Math.min(size, 8 + header.readUInt32LE(4));
    let offset = 12;
    let format;
    for (let chunk = 0; chunk < MAX_CHUNKS && offset + 8 <= riffEnd; chunk++) {
      const head = readAt(fd, offset, 8);
      const id = head.toString('latin1', 0, 4);
      const length = head.readUInt32LE(4);
      const body = offset + 8;
      if (body + length > riffEnd) throw new WavError(`The ${JSON.stringify(id)} chunk claims more bytes than the file has.`);
      if (id === 'fmt ') format = parseFormat(readAt(fd, body, Math.min(length, 40)), length);
      if (id === 'data') {
        if (!format) throw new WavError('The audio data comes before its format description.');
        if (length === 0) throw new WavError('This WAV contains no audio.');
        if (length % format.blockAlign !== 0) throw new WavError('The audio data does not end on a whole sample frame.');
        const frames = length / format.blockAlign;
        return { ...format, frames, duration: frames / format.sampleRate, dataOffset: body, dataSize: length };
      }
      offset = body + length + (length % 2); // chunks are padded to even sizes
    }
    throw new WavError('No audio data was found in the first 64 chunks of this file.');
  } finally {
    closeSync(fd);
  }
}

function parseFormat(fmt, length) {
  if (length < 16) throw new WavError('The WAV format description is too short.');
  let tag = fmt.readUInt16LE(0);
  const channels = fmt.readUInt16LE(2);
  const sampleRate = fmt.readUInt32LE(4);
  const byteRate = fmt.readUInt32LE(8);
  const blockAlign = fmt.readUInt16LE(12);
  const bitsPerSample = fmt.readUInt16LE(14);
  if (tag === EXTENSIBLE) {
    if (length < 40 || fmt.length < 26) throw new WavError('The extensible WAV format description is incomplete.');
    tag = fmt.readUInt16LE(24); // first two bytes of the sub-format GUID
  }
  const encoding = tag === PCM ? 'pcm' : tag === FLOAT ? 'float' : null;
  if (!encoding) throw new WavError('Only PCM and floating-point WAV files are supported.');
  const allowedBits = encoding === 'pcm' ? [8, 16, 24, 32] : [32, 64];
  if (!allowedBits.includes(bitsPerSample)) throw new WavError(`${bitsPerSample}-bit ${encoding} WAV files are not supported.`);
  if (channels < 1 || channels > 8) throw new WavError('WAV files must have 1 to 8 channels.');
  if (sampleRate < 8000 || sampleRate > 192000) throw new WavError('The sample rate must be between 8 and 192 kHz.');
  if (blockAlign !== channels * (bitsPerSample / 8) || byteRate !== sampleRate * blockAlign) {
    throw new WavError('The WAV format description is inconsistent.');
  }
  return { encoding, channels, sampleRate, bitsPerSample, blockAlign };
}

// Streams the data chunk once and returns per-channel peak and RMS in dBFS. Stops early when the
// signal is aborted (cancelled job or time limit).
export function measureLevels(path, format, signal) {
  const { channels, bitsPerSample, encoding, blockAlign, dataOffset, dataSize } = format;
  const bytes = bitsPerSample / 8;
  const read = encoding === 'float'
    ? (bitsPerSample === 32 ? (b, o) => b.readFloatLE(o) : (b, o) => b.readDoubleLE(o))
    : bitsPerSample === 8 ? (b, o) => (b[o] - 128) / 128
      : bitsPerSample === 16 ? (b, o) => b.readInt16LE(o) / 32768
        : bitsPerSample === 24 ? (b, o) => b.readIntLE(o, 3) / 8388608
          : (b, o) => b.readInt32LE(o) / 2147483648;
  const peak = new Array(channels).fill(0);
  const squares = new Array(channels).fill(0);
  let frames = 0;
  let carry = Buffer.alloc(0);
  return new Promise((resolve, reject) => {
    const stream = createReadStream(path, { start: dataOffset, end: dataOffset + dataSize - 1, highWaterMark: 1 << 20 });
    const abort = () => stream.destroy(new Error(signal.reason ?? 'aborted'));
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    stream.on('data', chunk => {
      const buffer = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      const whole = buffer.length - (buffer.length % blockAlign);
      for (let frame = 0; frame < whole; frame += blockAlign) {
        for (let channel = 0; channel < channels; channel++) {
          const value = read(buffer, frame + channel * bytes);
          const magnitude = Math.abs(value);
          if (magnitude > peak[channel]) peak[channel] = magnitude;
          squares[channel] += value * value;
        }
      }
      frames += whole / blockAlign;
      carry = buffer.subarray(whole);
    });
    stream.on('error', error => {
      signal.removeEventListener('abort', abort);
      reject(error);
    });
    stream.on('end', () => {
      signal.removeEventListener('abort', abort);
      const db = value => (value > 0 ? Math.round(10 * Math.log10(value) * 100) / 100 : null);
      resolve({
        frames,
        channels: peak.map((value, channel) => ({ peakDbfs: db(value * value), rmsDbfs: db(squares[channel] / frames) })),
      });
    });
  });
}
