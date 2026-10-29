import { analyze } from './analysis.js';
import { decodeWav, WavDecodeError } from './wav-decode.js';

// Runs the whole analysis off the page's main thread (LAS-26): reading, hashing, decoding and
// measuring. The page cancels by terminating the worker.
self.onmessage = async ({ data: { file } }) => {
  try {
    self.postMessage({ type: 'progress', stage: 'Reading the file…' });
    const bytes = await file.arrayBuffer();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const sha256 = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
    self.postMessage({ type: 'progress', stage: 'Decoding samples…' });
    const audio = decodeWav(bytes);
    if (audio.channels > 2) throw new WavDecodeError(`Analysis supports mono and stereo audio. This file has ${audio.channels} channels.`);
    self.postMessage({ type: 'progress', stage: 'Measuring loudness, peaks, stereo and spectrum…' });
    const report = analyze(audio.samples, audio.sampleRate);
    report.input = { ...report.input, name: file.name, bytes: file.size, sha256, encoding: audio.encoding, bitsPerSample: audio.bitsPerSample };
    self.postMessage({ type: 'done', report });
  } catch (error) {
    const known = error instanceof WavDecodeError;
    self.postMessage({ type: 'error', message: known ? error.message : 'Analysis failed unexpectedly. Try again.' });
  }
};
