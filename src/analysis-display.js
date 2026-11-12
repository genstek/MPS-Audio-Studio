// How a track-analysis report is shown (LAS-26) as plain data. The analysis dialog and the saved
// PDF (LAS-172) both render these rows, so the saved text is the text on screen.

const fixed = (value, digits = 1) => {
  const text = value.toFixed(digits);
  return Number(text) === 0 ? text.replace('-', '') : text.replace('-', '−'); // no "−0.0"
};
const signed = (value, digits = 1) => `${value > 0 ? '+' : ''}${fixed(value, digits)}`;
const level = (value, unit, digits = 1) => (value === null ? '—' : `${fixed(value, digits)} ${unit}`);

export const clock = seconds => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;

export function loudnessNote(loudness) {
  if (loudness.state === 'silent') return 'Silent: no part of the audio is above the −70 LUFS gate.';
  if (loudness.state === 'too-short') return 'Too short to measure loudness (under 0.4 seconds).';
  return null;
}

export const bandLabel = centreHz => (centreHz >= 1000 ? `${centreHz / 1000} kHz` : `${centreHz} Hz`);

export function displayRows(report) {
  const { loudness, peaks, levels, clipping, stereo, spectrum } = report;
  const loudnessRows = [
    ['Integrated loudness', level(loudness.integratedLufs, 'LUFS')],
    ['Loudness range', level(loudness.rangeLu, 'LU')],
    ['Max momentary loudness (400 ms)', level(loudness.momentaryMaxLufs, 'LUFS')],
    ['Max short-term loudness (3 s)', loudness.state === 'ok' && loudness.shortTermMaxLufs === null ? 'Needs 3 seconds' : level(loudness.shortTermMaxLufs, 'LUFS')],
    [`True peak (${peaks.oversampling}× oversampled)`, level(peaks.truePeakDbtp, 'dBTP', 2)],
    ['Sample peak', level(peaks.samplePeakDbfs, 'dBFS', 2)],
    ['RMS level', level(levels.rmsDbfs, 'dBFS')],
    ['Crest factor (sample peak − RMS)', level(levels.crestFactorDb, 'dB')],
    ['Peak to loudness ratio (true peak − integrated)', level(levels.plrDb, 'dB')],
    ['DC offset', levels.dcOffset.map(offset => `${signed(offset * 100, 3)} %`).join(' / ')],
    ['Clipping (full-scale runs of 3+ samples)', clipping.clippedRuns ? `${clipping.clippedRuns} runs, ${clipping.clippedSamples} samples at full scale` : clipping.clippedSamples ? `None; ${clipping.clippedSamples} isolated full-scale samples` : 'None detected'],
  ];
  const stereoRows = stereo && [
    ['Correlation (L/R)', stereo.correlation === null ? '—' : signed(stereo.correlation, 2)],
    ['Side relative to mid', stereo.channelsIdentical ? 'No side signal (left = right)' : level(stereo.sideToMidDb, 'dB')],
    ['Balance (left − right)', stereo.balanceDb === null ? '—' : `${signed(stereo.balanceDb)} dB`],
    ['Loudness change in mono', stereo.monoLoudnessChangeDb === null ? (stereo.correlation !== null && stereo.correlation < -0.9 ? 'Cancels to silence' : '—') : `${signed(stereo.monoLoudnessChangeDb)} LU`],
  ];
  const bands = spectrum.bands.map(band => ({
    key: band.centreHz,
    label: bandLabel(band.centreHz),
    share: band.share,
    shareText: `${(band.share * 100).toFixed(1)} %`,
    levelText: band.levelDb === null || band.levelDb < -90 ? 'below −90 dB' : level(band.levelDb, 'dB'),
  }));
  return { note: loudnessNote(loudness), loudnessRows, stereoRows, bands };
}

export function describeInput({ version, input }) {
  const format = `${input.bitsPerSample}-bit ${input.encoding === 'float' ? 'float' : 'PCM'}`;
  return `${version} · ${input.sampleRate.toLocaleString('en-US')} Hz · ${input.channels === 1 ? 'mono' : 'stereo'} · ${format} · whole file ${clock(input.segment.start)}–${clock(input.segment.end)}`;
}
