import { renderChain } from './chain.js';
import { renderSegment } from './segment-render.js';
import { analyze } from './analysis.js';
import { measureLoudness } from './loudness.js';
import { truePeak } from './true-peak.js';
import { encodeWav } from './wav-encode.js';
import { decodeWav, WavDecodeError } from './wav-decode.js';
import { ChainParamsError } from './chain-params.js';

// Offline rendering off the main thread (LAS-28), from the file's own samples at its own rate:
//   mode 'export': render with the chain, encode PCM WAV, report format and measured levels;
//   mode 'match':  render with the chain and measure the integrated loudness of both versions;
//   mode 'compare': analyse one section of the original and of the processed render (LAS-31).
// The page cancels by terminating the worker. The source file is only read.
const db = value => (value > 0 ? 20 * Math.log10(value) : null);
const peakOf = channel => channel.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

self.onmessage = async ({ data: { mode, file, params, bitDepth = 24, segment } }) => {
  try {
    self.postMessage({ type: 'progress', stage: 'Reading the file…', fraction: 0 });
    const source = decodeWav(await file.arrayBuffer());
    if (source.channels > 2) throw new WavDecodeError(`Processing supports mono and stereo audio. This file has ${source.channels} channels.`);
    if (mode === 'compare') {
      const duration = source.frames / source.sampleRate;
      if (!(segment.start >= 0 && segment.end > segment.start && segment.end <= duration + 1e-9)) {
        throw new WavDecodeError(`Choose a mix section inside the track (0 to ${duration.toFixed(1)} s).`);
      }
      const section = renderSegment(params, source.samples, source.sampleRate, segment, {
        onProgress: fraction => self.postMessage({ type: 'progress', stage: 'Rendering the section…', fraction: 0.05 + 0.6 * fraction }),
      });
      self.postMessage({ type: 'progress', stage: 'Measuring both versions…', fraction: 0.7 });
      const original = analyze(source.samples, source.sampleRate, segment);
      const processed = analyze(section.channels, source.sampleRate);
      processed.input = { ...processed.input, segment: original.input.segment };
      self.postMessage({ type: 'done', report: { original, processed, preRollSeconds: section.preRoll, warnings: section.warnings } });
      return;
    }
    const rendered = renderChain(params, source.samples, source.sampleRate, {
      onProgress: fraction => self.postMessage({ type: 'progress', stage: 'Rendering…', fraction: 0.05 + 0.85 * fraction }),
    });
    if (mode === 'match') {
      self.postMessage({ type: 'progress', stage: 'Measuring loudness…', fraction: 0.92 });
      const original = measureLoudness(source.samples, source.sampleRate);
      const processed = measureLoudness(rendered.channels, source.sampleRate);
      self.postMessage({ type: 'done', report: { originalLufs: original.integratedLufs, processedLufs: processed.integratedLufs } });
      return;
    }
    self.postMessage({ type: 'progress', stage: 'Writing the WAV file…', fraction: 0.92 });
    const { bytes, clippedSamples } = encodeWav(rendered.channels, source.sampleRate, { bitDepth });
    const loudness = measureLoudness(rendered.channels, source.sampleRate);
    const report = {
      name: file.name.replace(/\.wav$/i, '') + '-master.wav',
      sampleRate: source.sampleRate,
      channels: source.channels,
      bitDepth,
      dither: bitDepth === 16 ? 'TPDF ±1 LSB' : 'none (24-bit)',
      frames: source.frames,
      duration: source.frames / source.sampleRate,
      latencyCompensatedSamples: rendered.latency,
      clippedSamples,
      samplePeakDbfs: db(Math.max(...rendered.channels.map(peakOf))),
      truePeakDbtp: db(Math.max(...rendered.channels.map(channel => truePeak(channel)))),
      integratedLufs: loudness.integratedLufs,
      warnings: rendered.warnings,
      bytes: bytes.byteLength,
    };
    self.postMessage({ type: 'done', report, bytes }, [bytes]);
  } catch (error) {
    const known = error instanceof WavDecodeError || error instanceof ChainParamsError;
    self.postMessage({ type: 'error', message: known ? error.message : 'Rendering failed unexpectedly. Try again.' });
  }
};
