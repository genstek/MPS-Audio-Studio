import { describe, expect, it } from 'vitest';
import { measuredRows } from '../../src/measured-summary.js';

const report = { loudness: { integratedLufs: -14.04, rangeLu: 6.2 }, peaks: { truePeakDbtp: -1.234 }, stereo: { correlation: -0.5 } };

describe('measuredRows (LAS-45)', () => {
  it('says not analyzed without a report, or for another file', () => {
    const file = {};
    expect(measuredRows(null, file)).toMatchObject({ measured: false, rows: [] });
    expect(measuredRows({ file: {}, report }, file).measured).toBe(false);
  });
  it('reports the report values with provenance', () => {
    const file = {};
    const result = measuredRows({ file, report }, file);
    expect(result.measured).toBe(true);
    expect(result.source).toBe('Offline analysis (whole file)');
    expect(Object.fromEntries(result.rows)).toEqual({ 'Integrated loudness': '−14.0 LUFS', 'True peak': '−1.23 dBTP', 'Loudness range': '6.2 LU', 'L/R correlation': '−0.50' });
  });
  it('shows mono files and missing values honestly', () => {
    const file = {};
    const mono = measuredRows({ file, report: { ...report, stereo: null, loudness: { integratedLufs: null, rangeLu: null } } }, file);
    expect(Object.fromEntries(mono.rows)).toMatchObject({ 'Integrated loudness': '—', 'L/R correlation': 'Mono file' });
  });
});
