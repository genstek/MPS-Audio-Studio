// Decodes PCM and floating-point WAV data at its own sample rate for analysis (LAS-26). The browser's
// decodeAudioData would resample to the playback rate, so analysis reads the samples itself.
// The input buffer is only read, never changed.
const PCM = 1;
const FLOAT = 3;
const EXTENSIBLE = 0xfffe;
const MAX_CHUNKS = 64;

export class WavDecodeError extends Error {}

const tag = (view, offset) => String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));

function readFormat(view, offset, length) {
  if (length < 16) throw new WavDecodeError('The WAV format description is too short.');
  let format = view.getUint16(offset, true);
  const channels = view.getUint16(offset + 2, true);
  const sampleRate = view.getUint32(offset + 4, true);
  const blockAlign = view.getUint16(offset + 12, true);
  const bitsPerSample = view.getUint16(offset + 14, true);
  if (format === EXTENSIBLE) {
    if (length < 40) throw new WavDecodeError('The extensible WAV format description is incomplete.');
    format = view.getUint16(offset + 24, true); // first two bytes of the sub-format GUID
  }
  const encoding = format === PCM ? 'pcm' : format === FLOAT ? 'float' : null;
  if (!encoding) throw new WavDecodeError('Analysis supports PCM and floating-point WAV files only.');
  if (!(encoding === 'pcm' ? [8, 16, 24, 32] : [32, 64]).includes(bitsPerSample)) {
    throw new WavDecodeError(`Analysis does not support ${bitsPerSample}-bit ${encoding === 'pcm' ? 'PCM' : 'floating-point'} WAV files.`);
  }
  if (channels < 1) throw new WavDecodeError('The WAV format description has no channels.');
  if (sampleRate < 8000 || sampleRate > 384000) throw new WavDecodeError('Analysis supports sample rates from 8 to 384 kHz.');
  if (blockAlign !== channels * (bitsPerSample / 8)) throw new WavDecodeError('The WAV format description is inconsistent.');
  return { encoding, channels, sampleRate, bitsPerSample, blockAlign };
}

function sampleReader(view, { encoding, bitsPerSample }) {
  if (encoding === 'float') return bitsPerSample === 32 ? at => view.getFloat32(at, true) : at => view.getFloat64(at, true);
  switch (bitsPerSample) {
    case 8: return at => (view.getUint8(at) - 128) / 128; // 8-bit WAV is unsigned
    case 16: return at => view.getInt16(at, true) / 32768;
    case 24: return at => ((view.getUint8(at + 2) << 24) >> 8 | view.getUint8(at + 1) << 8 | view.getUint8(at)) / 8388608;
    default: return at => view.getInt32(at, true) / 2147483648;
  }
}

// bytes: ArrayBuffer of the whole file. Returns { encoding, channels, sampleRate, bitsPerSample,
// frames, samples: Float32Array per channel }. Throws WavDecodeError with a user-readable message.
export function decodeWav(bytes) {
  if (bytes.byteLength < 44) throw new WavDecodeError('This file is too short to be a WAV.');
  const view = new DataView(bytes);
  if (tag(view, 0) !== 'RIFF' || tag(view, 8) !== 'WAVE') throw new WavDecodeError('This file is not a WAV (RIFF/WAVE header missing).');
  const riffEnd = Math.min(bytes.byteLength, 8 + view.getUint32(4, true));
  let offset = 12;
  let format;
  for (let chunk = 0; chunk < MAX_CHUNKS && offset + 8 <= riffEnd; chunk++) {
    const id = tag(view, offset);
    const length = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (body + length > riffEnd) throw new WavDecodeError(`The ${JSON.stringify(id)} chunk claims more bytes than the file has.`);
    if (id === 'fmt ') format = readFormat(view, body, length);
    if (id === 'data') {
      if (!format) throw new WavDecodeError('The audio data comes before its format description.');
      if (length === 0) throw new WavDecodeError('This WAV contains no audio.');
      if (length % format.blockAlign !== 0) throw new WavDecodeError('The audio data does not end on a whole sample frame.');
      const frames = length / format.blockAlign;
      const read = sampleReader(view, format);
      const width = format.bitsPerSample / 8;
      const samples = Array.from({ length: format.channels }, (_, channel) => {
        const out = new Float32Array(frames);
        for (let n = 0, at = body + channel * width; n < frames; n++, at += format.blockAlign) out[n] = read(at);
        return out;
      });
      return { ...format, frames, samples };
    }
    offset = body + length + (length % 2); // chunks are padded to even sizes
  }
  throw new WavDecodeError('No audio data was found in the first 64 chunks of this file.');
}

// Format and length from the start of a file (at least its header) and the file's total size,
// without reading the audio: for showing a duration before measuring (LAS-30).
export function readWavHeader(head, fileSize) {
  if (head.byteLength < 44) throw new WavDecodeError('This file is too short to be a WAV.');
  const view = new DataView(head);
  if (tag(view, 0) !== 'RIFF' || tag(view, 8) !== 'WAVE') throw new WavDecodeError('This file is not a WAV (RIFF/WAVE header missing).');
  let offset = 12;
  let format;
  for (let chunk = 0; chunk < MAX_CHUNKS && offset + 8 <= head.byteLength; chunk++) {
    const id = tag(view, offset);
    const length = view.getUint32(offset + 4, true);
    if (id === 'fmt ') {
      if (offset + 8 + length > head.byteLength) break;
      format = readFormat(view, offset + 8, length);
    }
    if (id === 'data') {
      if (!format) throw new WavDecodeError('The audio data comes before its format description.');
      const available = Math.min(length, fileSize - (offset + 8));
      const frames = Math.floor(available / format.blockAlign);
      return { ...format, frames, duration: frames / format.sampleRate };
    }
    offset += 8 + length + (length % 2);
  }
  throw new WavDecodeError('No audio data was found near the start of this file.');
}
