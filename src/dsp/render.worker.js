import { renderChain, spaceTailSeconds } from './chain.js';
import { renderSegment } from './segment-render.js';
import { analyze } from './analysis.js';
import { proposeChain } from '../proposal.js';
import { ComparisonError } from '../reference-comparison.js';
import { renderStemMix, StemRenderError } from './stem-render.js';
import { measureLoudness } from './loudness.js';
import { truePeak } from './true-peak.js';
import { encodeWav } from './wav-encode.js';
import { decodeWav, WavDecodeError } from './wav-decode.js';
import { ChainParamsError } from './chain-params.js';
import { resample, checkConversion, ResampleError, SUPPORTED_RATES } from './resample.js';

// Offline rendering off the main thread (LAS-28), from the file's own samples at its own rate:
//   mode 'export': render with the chain, encode PCM WAV, report format and measured levels;
//   mode 'match':  render with the chain and measure the integrated loudness of both versions;
//   mode 'compare': analyse one section of the original and of the processed render (LAS-31);
//   mode 'propose': build a reference-guided proposal for one section (LAS-32);
//   mode 'stems':   render the stem master and each audible stem's strip output (LAS-35).
// The page cancels by terminating the worker. The source file is only read.
const db = value => (value > 0 ? 20 * Math.log10(value) : null);
const peakOf = channel => channel.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

self.onmessage = async ({ data: { mode, file, params, bitDepth = 24, segment, reference, stems, includeTail = false, targetSampleRate = null, resampleOnly = false } }) => {
  try {
    if (mode === 'stems') {
      await renderStems(stems, params, bitDepth); // awaited, so its errors reach the catch below
      return;
    }
    self.postMessage({ type: 'progress', stage: 'Reading the file…', fraction: 0 });
    const source = decodeWav(await file.arrayBuffer());
    if (source.channels > 2) throw new WavDecodeError(`Processing supports mono and stereo audio. This file has ${source.channels} channels.`);
    const duration = source.frames / source.sampleRate;
    if ((mode === 'compare' || mode === 'propose') && !(segment.start >= 0 && segment.end > segment.start && segment.end <= duration + 1e-9)) {
      throw new WavDecodeError(`Choose a mix section inside the track (0 to ${duration.toFixed(1)} s).`);
    }
    if (mode === 'propose') {
      const original = analyze(source.samples, source.sampleRate, segment);
      const renderSection = sectionParams => {
        const rendered = renderSegment(sectionParams, source.samples, source.sampleRate, segment);
        return { report: analyze(rendered.channels, source.sampleRate), meters: rendered.meters };
      };
      const proposal = proposeChain({
        reference, original, sampleRate: source.sampleRate, renderSection,
        onProgress: (stage, fraction) => self.postMessage({ type: 'progress', stage, fraction }),
      });
      self.postMessage({ type: 'done', report: { ...proposal, original } });
      return;
    }
    if (mode === 'compare') {
      const section = renderSegment(params, source.samples, source.sampleRate, segment, {
        onProgress: fraction => self.postMessage({ type: 'progress', stage: 'Rendering the section…', fraction: 0.05 + 0.6 * fraction }),
      });
      self.postMessage({ type: 'progress', stage: 'Measuring both versions…', fraction: 0.7 });
      const original = analyze(source.samples, source.sampleRate, segment);
      const processed = analyze(section.channels, source.sampleRate);
      processed.input = { ...processed.input, segment: original.input.segment };
      self.postMessage({ type: 'done', report: { original, processed, meters: section.meters, preRollSeconds: section.preRoll, warnings: section.warnings } });
      return;
    }
    // LAS-127: optional sample-rate conversion (export only). The source is band-limit resampled
    // first, then the chain runs at the destination rate (same chain code as the preview).
    const outRate = mode === 'export' && targetSampleRate ? targetSampleRate : source.sampleRate;
    const converting = outRate !== source.sampleRate;
    if (converting && !SUPPORTED_RATES.includes(outRate)) throw new ResampleError(`${outRate} Hz is not an available export rate.`);
    // LAS-64: with Space on, an export may keep the reverb tail after the source ends.
    const tailFrames = mode === 'export' && includeTail && !resampleOnly ? Math.ceil(spaceTailSeconds(params) * outRate) : 0;
    let input = source.samples;
    if (mode === 'export') {
      checkConversion({ frames: source.frames, channels: source.channels, inRate: source.sampleRate, outRate, bitDepth, extraFrames: tailFrames });
      if (converting) {
        input = resample(source.samples, source.sampleRate, outRate, {
          bitDepth,
          onProgress: fraction => self.postMessage({ type: 'progress', stage: `Converting ${source.sampleRate.toLocaleString('en-US')} Hz → ${outRate.toLocaleString('en-US')} Hz…`, fraction: 0.02 + 0.3 * fraction }),
        });
      }
    }
    const outFrames = input[0].length;
    const rendered = mode === 'export' && resampleOnly
      ? { channels: input, latency: 0, warnings: [] }
      : renderChain(params, input, outRate, {
        tailFrames,
        onProgress: fraction => self.postMessage({ type: 'progress', stage: 'Rendering…', fraction: converting ? 0.33 + 0.57 * fraction : 0.05 + 0.85 * fraction }),
      });
    const conversionWarnings = [];
    if (outRate > source.sampleRate) conversionWarnings.push(`Upsampled from ${source.sampleRate.toLocaleString('en-US')} Hz to ${outRate.toLocaleString('en-US')} Hz: this does not add detail; the source has no content above ${(source.sampleRate / 2).toLocaleString('en-US')} Hz.`);
    if (outRate < source.sampleRate) conversionWarnings.push(`Downsampled to ${outRate.toLocaleString('en-US')} Hz: content above about ${Math.round(outRate * 0.45).toLocaleString('en-US')} Hz is removed by the anti-aliasing filter.`);
    if (mode === 'match') {
      self.postMessage({ type: 'progress', stage: 'Measuring loudness…', fraction: 0.92 });
      const original = measureLoudness(source.samples, source.sampleRate);
      const processed = measureLoudness(rendered.channels, source.sampleRate);
      self.postMessage({ type: 'done', report: { originalLufs: original.integratedLufs, processedLufs: processed.integratedLufs } });
      return;
    }
    self.postMessage({ type: 'progress', stage: 'Writing the WAV file…', fraction: 0.92 });
    const { bytes, clippedSamples } = encodeWav(rendered.channels, outRate, { bitDepth });
    const loudness = measureLoudness(rendered.channels, outRate);
    const report = {
      name: file.name.replace(/\.wav$/i, '') + (resampleOnly ? `-${outRate / 1000}k` : '-master') + '.wav',
      sampleRate: outRate,
      sourceSampleRate: source.sampleRate,
      resampled: converting,
      resampleOnly,
      channels: source.channels,
      bitDepth,
      dither: bitDepth === 16 ? 'TPDF ±1 LSB' : 'none (24-bit)',
      frames: outFrames + tailFrames,
      duration: (outFrames + tailFrames) / outRate,
      sourceFrames: source.frames,
      convertedSourceFrames: outFrames,
      tailFrames,
      latencyCompensatedSamples: rendered.latency,
      clippedSamples,
      samplePeakDbfs: db(Math.max(...rendered.channels.map(peakOf))),
      truePeakDbtp: db(Math.max(...rendered.channels.map(channel => truePeak(channel)))),
      integratedLufs: loudness.integratedLufs,
      warnings: [...conversionWarnings, ...rendered.warnings],
      bytes: bytes.byteLength,
    };
    self.postMessage({ type: 'done', report, bytes }, [bytes]);
  } catch (error) {
    const known = error instanceof WavDecodeError || error instanceof ChainParamsError || error instanceof ComparisonError || error instanceof StemRenderError || error instanceof ResampleError;
    self.postMessage({ type: 'error', message: known ? error.message : 'Rendering failed unexpectedly. Try again.' });
  }
};

// Stem master (LAS-35): every stem is decoded from its own file (never resampled), rendered through
// its own chain, gain, pan and offset, summed and rendered through the master chain. Samples beyond
// full scale are clipped and counted in the report, never normalised.
async function renderStems(list, master, bitDepth) {
  const decoded = [];
  for (const [i, stem] of list.entries()) {
    self.postMessage({ type: 'progress', stage: `Reading ${stem.name}…`, fraction: 0.05 * (i / list.length) });
    const audio = decodeWav(await stem.file.arrayBuffer());
    decoded.push({ ...stem, sampleRate: audio.sampleRate, channels: audio.samples, offsetFrames: Math.round(stem.offsetSeconds * audio.sampleRate) });
  }
  const mix = renderStemMix({ stems: decoded, master, onProgress: (stage, fraction) => self.postMessage({ type: 'progress', stage, fraction: 0.05 + 0.8 * fraction }) });
  self.postMessage({ type: 'progress', stage: 'Writing the WAV files…', fraction: 0.9 });
  const describe = (name, channels, stereo = null) => {
    const { bytes, clippedSamples } = encodeWav(channels, mix.sampleRate, { bitDepth });
    return {
      name, bytes, stereo, clippedSamples, frames: mix.frames, duration: mix.frames / mix.sampleRate, sampleRate: mix.sampleRate, channels: channels.length, bitDepth,
      samplePeakDbfs: db(Math.max(...channels.map(peakOf))), truePeakDbtp: db(Math.max(...channels.map(channel => truePeak(channel)))),
      integratedLufs: measureLoudness(channels, mix.sampleRate).integratedLufs,
    };
  };
  const files = [describe('stem-master.wav', mix.combined), ...mix.strips.map(strip => describe(`${strip.name.replace(/\.wav$/i, '')}-stem.wav`, strip.channels, strip.stereo))];
  self.postMessage({ type: 'done', report: { files: files.map(({ bytes, ...rest }) => ({ ...rest, bytes: bytes.byteLength })), silent: mix.silent, latencyCompensatedSamples: mix.latency }, bytes: files.map(f => f.bytes) }, files.map(f => f.bytes));
}
