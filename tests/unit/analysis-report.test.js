import { describe, expect, test, vi } from 'vitest';
import { analyze } from '../../src/dsp/analysis.js';
import { displayRows } from '../../src/analysis-display.js';
import { REPORT_SCHEMA, baseName, buildReportDocument, buildReportJson, buildReportPdf, pdfSafe, reportFileName, reportJsonText, safeBaseName, saveReport } from '../../src/analysis-report.js';
import { noise, sine } from '../fixtures/signals.js';

const analyzedAt = new Date('2026-11-11T04:30:15.250Z');
const timeZone = { name: 'Europe/Berlin', utcOffsetMinutes: 60 };
const options = { analyzedAt, timeZone, app: { version: '0.1.0' } };

// What the analysis worker returns: analyze() plus the file facts it adds.
function makeReport({ fs = 48000, channels = 2, seconds = 6, bits = 16, encoding = 'pcm', name = 'mix.wav', samples } = {}) {
  const left = samples ?? sine({ rate: fs, seconds, frequency: 1000, dbfs: -20 });
  const audio = channels === 1 ? [left] : [left, samples ? left : sine({ rate: fs, seconds, frequency: 1500, dbfs: -26 })];
  const report = analyze(audio, fs);
  report.input = { ...report.input, name, bytes: 123456, sha256: 'ab'.repeat(32), encoding, bitsPerSample: bits, fileDuration: report.input.duration };
  return report;
}

const textOf = pdf => {
  const source = Buffer.from(pdf).toString('latin1');
  return Array.from(source.matchAll(/\((.*?)\) Tj/g), m => m[1].replace(/\\([\\()])/g, '$1'));
};

describe('LAS-172 JSON report', () => {
  test('uses the schema id, units in field names and maps every displayed measurement', () => {
    const report = makeReport();
    const json = buildReportJson(report, options);
    expect(json.schema).toBe(REPORT_SCHEMA);
    expect(json.schema).toBe('mps-track-analysis/v1');
    expect(json.app).toEqual({ name: 'MPS Audio Studio', version: '0.1.0' });
    expect(json.analysis).toMatchObject({ algorithm: 'mps-analysis-1', analyzedAt: '2026-11-11T04:30:15.250Z', timeZone: 'Europe/Berlin', utcOffsetMinutes: 60 });
    expect(json.source).toEqual({ fileName: 'mix.wav', sha256: 'ab'.repeat(32), sizeBytes: 123456 });
    expect(json.loudness).toEqual({ state: 'ok', integratedLufs: report.loudness.integratedLufs, loudnessRangeLu: report.loudness.rangeLu, momentaryMaxLufs: report.loudness.momentaryMaxLufs, shortTermMaxLufs: report.loudness.shortTermMaxLufs });
    expect(json.peaks).toMatchObject({ truePeakDbtp: report.peaks.truePeakDbtp, truePeakOversampling: 4, samplePeakDbfs: report.peaks.samplePeakDbfs });
    expect(json.levels).toMatchObject({ rmsDbfs: report.levels.rmsDbfs, crestFactorDb: report.levels.crestFactorDb, peakToLoudnessRatioDb: report.levels.plrDb, dcOffsetFractionOfFullScale: report.levels.dcOffset });
    expect(json.clipping).toEqual(report.clipping);
    expect(json.stereo).toEqual({ correlation: report.stereo.correlation, sideToMidDb: report.stereo.sideToMidDb, channelsIdentical: false, leftRightBalanceDb: report.stereo.balanceDb, monoLoudnessChangeLu: report.stereo.monoLoudnessChangeDb });
    expect(json.spectrum.available).toBe(true);
    expect(json.spectrum.bands).toHaveLength(10);
    json.spectrum.bands.forEach((band, i) => expect(band).toEqual({ centreHz: report.spectrum.bands[i].centreHz, energyShareFraction: report.spectrum.bands[i].share, levelRelativeToTotalDb: report.spectrum.bands[i].levelDb }));
  });

  test.each([[44100], [48000], [96000]])('decoded media metadata is the real %i Hz rate, not derived from the name', fs => {
    const json = buildReportJson(makeReport({ fs, name: 'is-really-8000-hz.wav', bits: 24 }), options);
    expect(json.media).toMatchObject({ sampleRateHz: fs, channels: 2, bitsPerSample: 24, sampleEncoding: 'pcm', frames: fs * 6, durationSeconds: 6 });
  });

  test('mono has no stereo section; float depth is kept', () => {
    const json = buildReportJson(makeReport({ channels: 1, bits: 32, encoding: 'float' }), options);
    expect(json.stereo).toBeNull();
    expect(json.media).toMatchObject({ channels: 1, bitsPerSample: 32, sampleEncoding: 'float' });
    expect(json.levels.dcOffsetFractionOfFullScale).toHaveLength(1);
  });

  test('silence and too-short files give null, never a fabricated 0; NaN and Infinity become null', () => {
    const silent = makeReport({ samples: new Float32Array(48000 * 2) });
    const json = buildReportJson(silent, options);
    expect(json.loudness.state).toBe('silent');
    expect(json.loudness.integratedLufs).toBeNull();
    expect(json.peaks.samplePeakDbfs).toBeNull();
    expect(json.levels.rmsDbfs).toBeNull();
    const short = buildReportJson(makeReport({ seconds: 0.1 }), options);
    expect(short.spectrum).toEqual({ available: false, bands: [] });

    const broken = makeReport();
    broken.loudness.integratedLufs = NaN;
    broken.peaks.truePeakDbtp = Infinity;
    broken.levels.rmsDbfs = undefined;
    broken.stereo.correlation = -Infinity;
    const out = buildReportJson(broken, options);
    expect([out.loudness.integratedLufs, out.peaks.truePeakDbtp, out.levels.rmsDbfs, out.stereo.correlation]).toEqual([null, null, null, null]);
    expect(() => JSON.parse(reportJsonText(broken, options))).not.toThrow();
  });

  test('text round-trips and holds no absolute path or audio bytes', () => {
    const report = makeReport({ name: '/Users/me/Music/secret song.wav' });
    const parsed = JSON.parse(reportJsonText(report, options));
    expect(parsed.source.fileName).toBe('secret song.wav');
    expect(JSON.stringify(parsed)).not.toMatch(/Users|Music|\/home/);
    expect(Object.keys(parsed)).not.toContain('samples'); // no audio data of any kind
    expect(JSON.stringify(parsed)).not.toMatch(/"(samples|audio|data|bytes)":/);
    expect(baseName('C:\\Audio\\take 1.wav')).toBe('take 1.wav');
  });

  test('building a report does not mutate the analysis result', () => {
    const report = makeReport();
    const before = JSON.stringify(report);
    buildReportJson(report, options);
    buildReportPdf(report, options);
    expect(JSON.stringify(report)).toBe(before);
  });
});

describe('LAS-172 file names', () => {
  test('safe basename and timestamp', () => {
    expect(reportFileName('My Track (final).wav', analyzedAt, 'pdf')).toBe('My_Track_final_analysis_20261111T043015Z.pdf');
    expect(reportFileName('x.wav', analyzedAt, 'json')).toBe('x_analysis_20261111T043015Z.json');
  });
  test.each([
    ['../../etc/passwd.wav', 'passwd'],
    ['a<b>:"c|d?*.wav', 'a_b_c_d'],
    ['Mix\u0000\n.wav', 'Mix'],
    ['Café été.wav', 'Cafe_ete'],
    ['日本語.wav', 'track'],
    ['', 'track'],
    ['.wav', 'track'],
  ])('%j → %j', (input, expected) => expect(safeBaseName(input)).toBe(expected));
  test('long names are limited', () => expect(safeBaseName(`${'a'.repeat(300)}.wav`).length).toBeLessThanOrEqual(80));
});

describe('LAS-172 PDF report', () => {
  const report = makeReport({ name: 'Weird (name) file.wav' });
  const pdf = buildReportPdf(report, options);
  const source = Buffer.from(pdf).toString('latin1');

  test('is a structurally valid PDF: header, xref offsets, trailer, page count', () => {
    expect(source.startsWith('%PDF-1.4\n')).toBe(true);
    expect(source.trimEnd().endsWith('%%EOF')).toBe(true);
    const start = Number(/startxref\n(\d+)\n%%EOF/.exec(source)[1]);
    expect(source.slice(start, start + 4)).toBe('xref');
    const size = Number(/trailer\n<< \/Size (\d+)/.exec(source)[1]);
    const entries = source.slice(start).split('\n').slice(3, 3 + size - 1);
    entries.forEach((entry, i) => {
      const offset = Number(entry.slice(0, 10));
      expect(source.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
    const pages = (source.match(/\/Type \/Page /g) ?? []).length;
    expect(Number(/\/Count (\d+)/.exec(source)[1])).toBe(pages);
    // every stream's declared length matches its content
    for (const [, length, body] of source.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) expect(body.length).toBe(Number(length));
  });

  test('prints every label and the same rounded values the dialog shows, with units', () => {
    const text = textOf(pdf).join('\n');
    const shown = displayRows(report);
    for (const [label, value] of [...shown.loudnessRows, ...shown.stereoRows]) {
      expect(text).toContain(pdfSafe(label).slice(0, 20));
      expect(text).toContain(pdfSafe(value).slice(0, 18));
    }
    for (const band of shown.bands) {
      expect(text).toContain(band.label);
      expect(text).toContain(pdfSafe(band.shareText));
    }
    expect(text).toContain('LUFS');
    expect(text).toContain('dBTP');
    expect(text).toContain('Weird (name) file.wav'); // escaped in the stream, readable when decoded
    expect(text).toContain('48,000 Hz');
    expect(text).toContain('16-bit PCM');
    expect(text).toContain('mps-analysis-1');
    expect(text).toContain('MPS Audio Studio 0.1.0');
    expect(text).toContain('2026-11-11T04:30:15.250Z (Europe/Berlin,\nUTC+01:00)'); // wrapped inside the value column
  });

  test('the SHA-256 is printed whole and the document has no absolute path', () => {
    const doc = buildReportDocument(report, options);
    expect(doc.sections[0].rows[1]).toEqual(['Source SHA-256', 'ab'.repeat(32)]);
    expect(textOf(pdf).join('')).toContain('ab'.repeat(32));
  });

  test('escapes parentheses and backslashes so the content stream stays well formed', () => {
    const opens = (source.match(/(?<!\\)\(/g) ?? []).length;
    const closes = (source.match(/(?<!\\)\)/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  test('long content paginates: no line is placed below the bottom margin, footers count pages', () => {
    const long = makeReport({ name: `${'very-long-name-'.repeat(40)}.wav` });
    const out = Buffer.from(buildReportPdf(long, options)).toString('latin1');
    for (const [, y] of out.matchAll(/ Td \(/g) ? out.matchAll(/ ([\d.]+) Td \(/g) : []) expect(Number(y)).toBeGreaterThan(30);
    expect(out).toMatch(/page 1 of \d+/);
  });

  test('non-Latin-1 text is replaced, not corrupted', () => {
    expect(pdfSafe('−23.0 LUFS × 日')).toBe('-23.0 LUFS x ?');
    const bytes = buildReportPdf(makeReport({ name: '日本語.wav' }), options);
    expect(Math.max(...bytes)).toBeLessThanOrEqual(255);
    expect(textOf(bytes).join('\n')).toContain('???.wav');
  });

  test('mono report says stereo measures do not apply', () => {
    expect(textOf(buildReportPdf(makeReport({ channels: 1 }), options)).join('\n')).toContain('Not applicable (mono file)');
  });
});

describe('LAS-172 writing', () => {
  const blob = new Blob(['x']);
  const handleWith = writable => ({ name: 'chosen.json', createWritable: async () => writable });

  test('a completed picker write reports saved, using the name the user chose', async () => {
    const writable = { write: vi.fn(async () => {}), close: vi.fn(async () => {}) };
    const picker = vi.fn(async () => handleWith(writable));
    const result = await saveReport(blob, 'a.json', 'json', { picker });
    expect(result).toEqual({ status: 'saved', how: 'file', fileName: 'chosen.json' });
    expect(picker.mock.calls[0][0]).toMatchObject({ suggestedName: 'a.json' });
    expect(writable.write).toHaveBeenCalledWith(blob);
    expect(writable.close).toHaveBeenCalled();
  });

  test('cancelling the picker writes nothing and is not an error', async () => {
    const picker = vi.fn(async () => { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); });
    expect(await saveReport(blob, 'a.pdf', 'pdf', { picker })).toEqual({ status: 'cancelled' });
  });

  test('a failed write rejects, aborts the writable and never reports success', async () => {
    const writable = { write: vi.fn(async () => { throw new Error('disk full'); }), close: vi.fn(), abort: vi.fn(async () => {}) };
    await expect(saveReport(blob, 'a.json', 'json', { picker: async () => handleWith(writable) })).rejects.toThrow('disk full');
    expect(writable.close).not.toHaveBeenCalled();
    expect(writable.abort).toHaveBeenCalled();
  });

  test('a picker error other than cancel rejects', async () => {
    await expect(saveReport(blob, 'a.json', 'json', { picker: async () => { throw new Error('denied'); } })).rejects.toThrow('denied');
  });
});

test('different noise input still gives only finite numbers or null in the JSON', () => {
  const json = JSON.parse(reportJsonText(makeReport({ samples: noise({ seconds: 5, amplitude: 0.3 }) }), options));
  const walk = value => {
    if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(json);
});
