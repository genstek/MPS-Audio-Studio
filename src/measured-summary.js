// LAS-45: headline values of a finished offline analysis report, for the studio layouts' panels.
// Pure data: every value is the report's own number, never estimated here. Without a report for
// the current file every row says so.
const db = (value, unit, digits = 1) => (value === null || value === undefined ? '—' : `${value.toFixed(digits).replace('-', '−')} ${unit}`);

export function measuredRows(analysis, file) {
  const source = 'Offline analysis (whole file)';
  if (!analysis || analysis.file !== file || !analysis.report) {
    return { measured: false, source: 'Not analyzed yet — use Analyze on the track', rows: [] };
  }
  const { loudness, peaks, stereo } = analysis.report;
  const rows = [
    ['Integrated loudness', db(loudness.integratedLufs, 'LUFS')],
    ['True peak', db(peaks.truePeakDbtp, 'dBTP', 2)],
    ['Loudness range', db(loudness.rangeLu, 'LU')],
    ['L/R correlation', stereo ? (stereo.correlation === null ? '—' : stereo.correlation.toFixed(2).replace('-', '−')) : 'Mono file'],
  ];
  return { measured: true, source, rows };
}
