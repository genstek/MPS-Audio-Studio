import { closeSync, openSync, writeSync } from 'node:fs';

// Writes a structurally valid 16-bit PCM WAV of exactly `size` bytes to `path` (LAS-71), in chunks,
// so files near the 250 MiB limit can be made without holding them in memory. The content is a
// quiet synthetic 220 Hz tone in every channel (original test audio, no recorded material).
// `extra` appends that many bytes after the data chunk (an oversize file that is still a WAV).
export function writeWavOfSize(path, size, { channels = 2, sampleRate = 44100, extra = 0 } = {}) {
  const blockAlign = channels * 2;
  const dataBytes = size - 44;
  if (dataBytes <= 0 || dataBytes % blockAlign) throw new Error(`size - 44 must be a positive multiple of ${blockAlign}`);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(size - 8, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  const fd = openSync(path, 'w');
  try {
    writeSync(fd, header);
    // One second of tone is repeated; 220 Hz fits a whole number of cycles into 44,100 frames.
    const period = Buffer.alloc(sampleRate * blockAlign);
    for (let frame = 0; frame < sampleRate; frame++) {
      const value = Math.round(3000 * Math.sin(2 * Math.PI * 220 * frame / sampleRate));
      for (let c = 0; c < channels; c++) period.writeInt16LE(value, frame * blockAlign + c * 2);
    }
    for (let written = 0; written < dataBytes; written += period.length) writeSync(fd, period, 0, Math.min(period.length, dataBytes - written));
    if (extra) writeSync(fd, Buffer.alloc(extra));
  } finally {
    closeSync(fd);
  }
  return size + extra;
}
