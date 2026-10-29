// Original synthetic PCM16 tone (440 Hz in every channel); no recorded or copyrighted audio.
// makeWav() keeps the original 3-second mono 44.1 kHz file; options make other shapes.
export function makeWav({ seconds = 3, channels = 1, sampleRate = 44100 } = {}) {
  const frames = Math.round(sampleRate * seconds);
  const blockAlign = channels * 2;
  const bytes = Buffer.alloc(44 + frames * blockAlign);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(channels, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * blockAlign, 28);
  bytes.writeUInt16LE(blockAlign, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(frames * blockAlign, 40);
  for (let frame = 0; frame < frames; frame++) {
    const sample = Math.round(1000 * Math.sin(2 * Math.PI * 440 * frame / sampleRate));
    for (let channel = 0; channel < channels; channel++) {
      bytes.writeInt16LE(sample, 44 + frame * blockAlign + channel * 2);
    }
  }
  return bytes;
}
