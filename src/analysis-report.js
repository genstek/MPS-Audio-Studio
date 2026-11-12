// Saving a completed track analysis as JSON or PDF (LAS-172). Everything here works on the report
// object the dialog already shows: nothing is measured again, no audio is read, nothing is sent
// anywhere. The report carries the file's base name and SHA-256 only, never a path or audio bytes.
import { MEASUREMENTS } from './dsp/analysis.js';
import { displayRows, describeInput } from './analysis-display.js';

export const REPORT_SCHEMA = 'mps-track-analysis/v1';
export const APP_NAME = 'MPS Audio Studio';

// Finite numbers pass through; NaN, ±Infinity, undefined and non-numbers become null ("not measured").
const num = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const text = value => (typeof value === 'string' ? value : null);

// The file's base name without any directory part (browsers give no path, but never trust that).
export const baseName = name => Array.from(String(name ?? '').split(/[\\/]/).pop(), ch => (ch.codePointAt(0) < 32 || ch.codePointAt(0) === 127 ? '' : ch)).join('');

export function safeBaseName(name) {
  const base = baseName(name).replace(/\.[^.]*$/, '');
  const safe = base.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._]+|[._]+$/g, '').slice(0, 80);
  return safe || 'track';
}

const stamp = date => date.toISOString().replace(/\.\d+Z$/, 'Z').replace(/[-:]/g, '');

export const reportFileName = (name, analyzedAt, extension) => `${safeBaseName(name)}_analysis_${stamp(analyzedAt)}.${extension}`;

export function timeZoneOf(date) {
  let zone = null;
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; } catch { /* no Intl time zone */ }
  return { name: zone, utcOffsetMinutes: -date.getTimezoneOffset() };
}

// The JSON document. Units are in the field names. A measurement that does not exist (silence,
// a file too short, mono stereo fields, a missing 3 s window) is null, never 0; `stereo` is null for mono.
export function buildReportJson(report, { analyzedAt, timeZone = timeZoneOf(analyzedAt), app = {} } = {}) {
  const { input, loudness, peaks, levels, clipping, stereo, spectrum } = report;
  return {
    schema: REPORT_SCHEMA,
    nullMeaning: 'null means the value is not available for this file (silence, too short, not applicable or not finite). It is never a measured zero.',
    app: { name: APP_NAME, version: text(app.version) },
    analysis: {
      algorithm: report.version,
      analyzedAt: analyzedAt.toISOString(),
      timeZone: timeZone.name,
      utcOffsetMinutes: timeZone.utcOffsetMinutes,
      definitions: Object.fromEntries(Object.entries(MEASUREMENTS)),
    },
    source: { fileName: baseName(input.name), sha256: text(input.sha256), sizeBytes: num(input.bytes) },
    media: {
      sampleRateHz: num(input.sampleRate),
      channels: num(input.channels),
      bitsPerSample: num(input.bitsPerSample),
      sampleEncoding: text(input.encoding),
      frames: num(input.frames),
      durationSeconds: num(input.fileDuration ?? input.duration),
      analyzedSegment: { startSeconds: num(input.segment?.start), endSeconds: num(input.segment?.end) },
    },
    loudness: {
      state: text(loudness.state),
      integratedLufs: num(loudness.integratedLufs),
      loudnessRangeLu: num(loudness.rangeLu),
      momentaryMaxLufs: num(loudness.momentaryMaxLufs),
      shortTermMaxLufs: num(loudness.shortTermMaxLufs),
    },
    peaks: {
      truePeakDbtp: num(peaks.truePeakDbtp),
      truePeakOversampling: num(peaks.oversampling),
      samplePeakDbfs: num(peaks.samplePeakDbfs),
      perChannel: peaks.perChannel.map(c => ({ samplePeakDbfs: num(c.samplePeakDbfs), truePeakDbtp: num(c.truePeakDbtp) })),
    },
    levels: {
      rmsDbfs: num(levels.rmsDbfs),
      perChannelRmsDbfs: levels.perChannelRmsDbfs.map(num),
      crestFactorDb: num(levels.crestFactorDb),
      peakToLoudnessRatioDb: num(levels.plrDb),
      dcOffsetFractionOfFullScale: levels.dcOffset.map(num),
    },
    clipping: { clippedSamples: num(clipping.clippedSamples), clippedRuns: num(clipping.clippedRuns) },
    stereo: stereo && {
      correlation: num(stereo.correlation),
      sideToMidDb: num(stereo.sideToMidDb),
      channelsIdentical: Boolean(stereo.channelsIdentical),
      leftRightBalanceDb: num(stereo.balanceDb),
      monoLoudnessChangeLu: num(stereo.monoLoudnessChangeDb),
    },
    spectrum: {
      available: spectrum.bands.length > 0,
      bands: spectrum.bands.map(b => ({ centreHz: num(b.centreHz), energyShareFraction: num(b.share), levelRelativeToTotalDb: num(b.levelDb) })),
    },
  };
}

export const reportJsonText = (report, options) => `${JSON.stringify(buildReportJson(report, options), null, 2)}\n`;

// ---- PDF -------------------------------------------------------------------------------------
// A small text-only PDF 1.4 writer: A4, standard Helvetica/Courier fonts, WinAnsi characters.
// Characters outside Latin-1 are replaced (the minus sign by "-"); the JSON keeps exact text.
const PAGE = { width: 595.28, height: 841.89, margin: 50, bottom: 60 };
const WIN_ANSI = { '−': '-', '–': '-', '—': '-', '×': 'x', '·': '-', '…': '...', '’': "'", '‘': "'", '“': '"', '”': '"' };

export function pdfSafe(value) {
  return Array.from(String(value ?? ''), ch => {
    if (WIN_ANSI[ch]) return WIN_ANSI[ch];
    const code = ch.codePointAt(0);
    if (code < 32 || code === 127) return ' ';
    return code <= 255 ? ch : '?';
  }).join('');
}
const pdfEscape = value => pdfSafe(value).replace(/[\\()]/g, '\\$&');

// Helvetica is narrower than 0.6 em on average; this keeps wrapped lines inside the page.
const wrap = (value, size, width) => {
  const perLine = Math.max(8, Math.floor(width / (size * 0.6)));
  const lines = [];
  for (const paragraph of pdfSafe(value).split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      let rest = word;
      while (rest.length > perLine) { // an unbroken run (hash, long name): split it
        if (line) { lines.push(line); line = ''; }
        lines.push(rest.slice(0, perLine));
        rest = rest.slice(perLine);
      }
      if (!line) line = rest;
      else if (line.length + 1 + rest.length <= perLine) line += ` ${rest}`;
      else { lines.push(line); line = rest; }
    }
    lines.push(line);
  }
  return lines;
};

// The document model both the PDF and the tests use: ordered sections of label/value rows.
export function buildReportDocument(report, { analyzedAt, timeZone = timeZoneOf(analyzedAt), app = {} } = {}) {
  const { input } = report;
  const shown = displayRows(report);
  const pad = n => String(Math.abs(n)).padStart(2, '0');
  const offset = timeZone.utcOffsetMinutes;
  const utcOffset = `UTC${offset < 0 ? '-' : '+'}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
  const sections = [
    { title: 'Track', rows: [
      ['File name', baseName(input.name)],
      ['Source SHA-256', input.sha256],
      ['File size', `${input.bytes.toLocaleString('en-US')} bytes`],
    ] },
    { title: 'Analysis', rows: [
      ['Algorithm / version', report.version],
      ['Analyzed', `${analyzedAt.toISOString()} (${timeZone.name ? `${timeZone.name}, ` : ''}${utcOffset})`],
      ['Application', `${APP_NAME}${app.version ? ` ${app.version}` : ' (version not available)'}`],
    ] },
    { title: 'Decoded media', rows: [
      ['Sampling rate', `${input.sampleRate.toLocaleString('en-US')} Hz`],
      ['Bit depth', input.bitsPerSample ? `${input.bitsPerSample}-bit ${input.encoding === 'float' ? 'float' : 'PCM'}` : 'Not available'],
      ['Channels', `${input.channels} (${input.channels === 1 ? 'mono' : 'stereo'})`],
      ['Duration', `${(input.fileDuration ?? input.duration).toFixed(3)} s`],
    ] },
    { title: 'Loudness, peaks and dynamics', rows: shown.loudnessRows },
  ];
  if (shown.stereoRows) sections.push({ title: 'Stereo', rows: shown.stereoRows });
  else sections.push({ title: 'Stereo', rows: [['Stereo measures', 'Not applicable (mono file)']] });
  return { title: 'Track analysis report', sections, note: shown.note, bands: shown.bands, footnote: describeInput(report) };
}

export function buildReportPdf(report, options) {
  const doc = buildReportDocument(report, options);
  const pages = [[]];
  let y = PAGE.height - PAGE.margin;
  const out = () => pages[pages.length - 1];
  const room = height => {
    if (y - height < PAGE.bottom) { pages.push([]); y = PAGE.height - PAGE.margin; }
  };
  const put = (font, size, x, value, gray = 0) => out().push(`BT /${font} ${size} Tf ${gray} g ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(value)}) Tj ET`);
  const rule = () => out().push(`0.75 G 0.5 w ${PAGE.margin} ${(y - 3).toFixed(2)} m ${PAGE.width - PAGE.margin} ${(y - 3).toFixed(2)} l S`);
  const labelX = PAGE.margin;
  const valueX = PAGE.margin + 230;
  const valueWidth = PAGE.width - PAGE.margin - valueX;
  const labelWidth = valueX - labelX - 10;

  put('F2', 18, PAGE.margin, doc.title);
  y -= 22;
  if (doc.note) { put('F1', 10, PAGE.margin, doc.note); y -= 16; }
  const heading = title => { room(60); y -= 8; put('F2', 12, PAGE.margin, title); y -= 6; rule(); y -= 13; };
  const row = (label, value, font = 'F1') => {
    const left = wrap(label, 10, labelWidth);
    const right = wrap(value, 10, valueWidth);
    const lines = Math.max(left.length, right.length);
    room(lines * 13 + 3);
    for (let i = 0; i < lines; i++) {
      if (left[i]) put('F1', 10, labelX, left[i], 0.25);
      if (right[i]) put(font, 10, valueX, right[i]);
      y -= 13;
    }
    y -= 3;
  };

  for (const section of doc.sections) {
    heading(section.title);
    for (const [label, value] of section.rows) row(label, value, label === 'Source SHA-256' ? 'F3' : 'F1');
  }
  room(40 + 16 * (doc.bands.length + 1)); // keep the whole spectrum table on one page
  heading('Spectrum: share of energy per octave band');
  if (doc.bands.length) {
    room(20);
    put('F2', 10, labelX, 'Band');
    put('F2', 10, valueX, 'Share');
    put('F2', 10, valueX + 100, 'Relative to total');
    y -= 16;
    for (const band of doc.bands) {
      room(16);
      put('F1', 10, labelX, band.label, 0.25);
      put('F1', 10, valueX, band.shareText);
      put('F1', 10, valueX + 100, band.levelText);
      y -= 16;
    }
  } else row('Spectrum', 'Needs at least 8,192 samples');
  y -= 6;
  for (const line of wrap(doc.footnote, 8, PAGE.width - 2 * PAGE.margin)) { room(11); put('F1', 8, PAGE.margin, line, 0.4); y -= 11; }
  for (const line of wrap('Measured on this device from the file\'s own samples. The file was only read, never changed or uploaded.', 8, PAGE.width - 2 * PAGE.margin)) { room(11); put('F1', 8, PAGE.margin, line, 0.4); y -= 11; }

  pages.forEach((commands, i) => commands.push(`BT /F1 8 Tf 0.4 g ${PAGE.margin} 36 Td (${pdfEscape(`${APP_NAME} - ${doc.title} - page ${i + 1} of ${pages.length}`)}) Tj ET`));
  return assemblePdf(pages.map(commands => commands.join('\n')), `${doc.title}: ${baseName(report.input.name)}`);
}

// Object numbers: 1 catalog, 2 pages, 3-5 fonts, 6 info, then a content stream and page per page.
function assemblePdf(streams, title) {
  const objects = [];
  const pageIds = streams.map((_, i) => 7 + i * 2 + 1);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${streams.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
  objects[6] = `<< /Title (${pdfEscape(title)}) /Producer (${APP_NAME}) >>`;
  streams.forEach((stream, i) => {
    const content = 7 + i * 2;
    objects[content] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[content + 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${content} 0 R >>`;
  });
  let body = '%PDF-1.4\n';
  const offsets = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(body.length); // every character is ≤ 255 by construction
  for (let i = 0; i < body.length; i++) bytes[i] = body.charCodeAt(i) & 0xff;
  return bytes;
}

// ---- Writing ---------------------------------------------------------------------------------
export const FORMATS = {
  pdf: { extension: 'pdf', mime: 'application/pdf', label: 'PDF' },
  json: { extension: 'json', mime: 'application/json', label: 'JSON' },
};

export function reportBlob(report, format, options) {
  const { mime } = FORMATS[format];
  return new Blob([format === 'pdf' ? buildReportPdf(report, options) : reportJsonText(report, options)], { type: mime });
}

// Resolves { status: 'saved', how: 'file', fileName } after the file was fully written, { status: 'downloaded',
// fileName } when the browser was handed a download (it cannot tell us when or where it lands),
// or { status: 'cancelled' }. Rejects on a real error. The picker asks before replacing a file.
export async function saveReport(blob, fileName, format, { picker = globalThis.window?.showSaveFilePicker?.bind(globalThis.window), document: doc = globalThis.document } = {}) {
  const { extension, mime, label } = FORMATS[format];
  if (typeof picker === 'function') {
    let handle;
    try {
      handle = await picker({ suggestedName: fileName, types: [{ description: `${label} report`, accept: { [mime]: [`.${extension}`] } }] });
    } catch (error) {
      if (error?.name === 'AbortError') return { status: 'cancelled' };
      throw error;
    }
    const writable = await handle.createWritable();
    try {
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      await writable.abort?.().catch(() => {});
      throw error;
    }
    return { status: 'saved', how: 'file', fileName: handle.name ?? fileName };
  }
  const url = URL.createObjectURL(blob);
  const link = Object.assign(doc.createElement('a'), { href: url, download: fileName });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { status: 'downloaded', fileName };
}
