import { analyze } from './analysis.js';
import { analyzeTimeline } from './timeline-analysis.js';
import { decodeWav, WavDecodeError } from './wav-decode.js';

// Runs the whole analysis off the page's main thread (LAS-26): reading, hashing, decoding and
// measuring. The page cancels by terminating the worker. An optional segment { start, end } in
// seconds measures part of the file (reference profiles, LAS-30).
self.onmessage = async ({ data: { file, segment, timeline } }) => {
  try {
    self.postMessage({ type: 'progress', stage: 'Reading the file…' });
    const bytes = await file.arrayBuffer();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const sha256 = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
    self.postMessage({ type: 'progress', stage: 'Decoding samples…' });
    const audio = decodeWav(bytes);
    if (audio.channels > 2) throw new WavDecodeError(`Analysis supports mono and stereo audio. This file has ${audio.channels} channels.`);
    const fileDuration = audio.frames / audio.sampleRate;
    if (segment && !(segment.start >= 0 && segment.end > segment.start && segment.end <= fileDuration + 1e-9)) {
      throw new WavDecodeError(`Choose a segment inside the file (0 to ${fileDuration.toFixed(1)} s).`);
    }
    self.postMessage({ type: 'progress', stage: 'Measuring loudness, peaks, stereo and spectrum…' });
    const report = analyze(audio.samples, audio.sampleRate, segment ?? {});
    report.input = { ...report.input, name: file.name, bytes: file.size, sha256, encoding: audio.encoding, bitsPerSample: audio.bitsPerSample, fileDuration };
    if (timeline && !segment) {
      // Time-indexed series over the whole file (LAS-173). Read-only; progress is reported by percent.
      let lastPercent = -1;
      report.timeline = analyzeTimeline(audio.samples, audio.sampleRate, {
        hopSeconds: timeline.hopSeconds,
        onProgress: fraction => {
          const percent = Math.floor(fraction * 100);
          if (percent !== lastPercent) { lastPercent = percent; self.postMessage({ type: 'progress', stage: `Measuring the timeline… ${percent} %` }); }
        },
      });
    }
    self.postMessage({ type: 'done', report });
  } catch (error) {
    const known = error instanceof WavDecodeError;
    self.postMessage({ type: 'error', message: known ? error.message : 'Analysis failed unexpectedly. Try again.' });
  }
};
