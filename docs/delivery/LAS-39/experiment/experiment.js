// LAS-39 baseline experiment: does a small learned parameter predictor add value over the
// deterministic, constrained reference matching of LAS-32, on data where the truth is known?
//   node docs/delivery/LAS-39/experiment/experiment.js [results.json]
// Everything is generated (data.js); nothing is downloaded, uploaded or stored besides the report.
import { writeFileSync } from 'node:fs';
import { analyze, ANALYSIS_VERSION } from '../../../../src/dsp/analysis.js';
import { renderSegment } from '../../../../src/dsp/segment-render.js';
import { proposeChain, PROPOSAL_VERSION } from '../../../../src/proposal.js';
import { compareToReference } from '../../../../src/reference-comparison.js';
import { decision, master, RATE, SECTIONS, song, SONG_SECONDS } from './data.js';
import { chainFromLabels, curveErrorDb, FEATURE_NAMES, features, labels } from './features.js';
import { bootstrap, leakageReport, nearest, ridge, scaler, splitByItem, splitBySong } from './protocol.js';

const CONFIG = { songs: 32, decisionsPerSong: 3, sectionsPerSong: SECTIONS.length, split: { train: 18, validation: 6, test: 8 }, seed: 39, lambdas: [0.01, 0.1, 1, 10, 100] };
const started = performance.now();
const phase = {};
const timed = (name, fn) => { const t = performance.now(); const out = fn(); phase[name] = Math.round((performance.now() - t) / 100) / 10; return out; };
const mean = values => values.reduce((s, v) => s + v, 0) / values.length;
const r2 = v => Math.round(v * 100) / 100;

// 1. Data: songs, known decisions, references, analysis reports, features and labels.
const songs = new Map();
const items = timed('data', () => {
  const out = [];
  for (let s = 1; s <= CONFIG.songs; s++) {
    const channels = song(s);
    songs.set(s, channels);
    const mixReports = SECTIONS.map(section => analyze(channels, RATE, section));
    for (let k = 0; k < CONFIG.decisionsPerSong; k++) {
      const choice = decision(s * 10 + k);
      const reference = master(channels, choice);
      SECTIONS.forEach((section, j) => {
        const refReport = analyze(reference, RATE, section);
        out.push({ key: `${s}:${k}:${j}`, song: s, decision: k, section: j, choice, mixReport: mixReports[j], refReport, features: features(mixReports[j], refReport), labels: labels(choice) });
      });
    }
  }
  return out;
});
const byKey = new Map(items.map(item => [item.key, item]));

// 2. Splits and leakage checks, before any training.
const songIds = [...songs.keys()];
const grouped = splitBySong(songIds, CONFIG.split, CONFIG.seed);
const groupedItems = Object.fromEntries(Object.entries(grouped).map(([name, ids]) => [name, items.filter(item => ids.includes(item.song))]));
const perSong = CONFIG.decisionsPerSong * CONFIG.sectionsPerSong;
const leaky = splitByItem(items, { train: CONFIG.split.train * perSong, validation: CONFIG.split.validation * perSong }, CONFIG.seed);
const leakyItems = Object.fromEntries(Object.entries(leaky).map(([name, keys]) => [name, keys.map(key => byKey.get(key))]));
const leakage = { grouped: leakageReport(groupedItems), leaky: leakageReport(leakyItems) };
if (!leakage.grouped.clean) throw new Error('The grouped split leaks; refusing to train.');

// 3. Models: scaling fitted on training items; ridge strength chosen on validation, then refitted
// on training + validation; one nearest neighbour on training + validation.
function trainModels(split) {
  const scale = scaler(split.train.map(item => item.features));
  const X = list => list.map(item => scale(item.features));
  const Y = list => list.map(item => item.labels);
  const validationError = lambda => {
    const model = ridge(X(split.train), Y(split.train), lambda);
    return mean(split.validation.map(item => mean(model(scale(item.features)).map((v, i) => (v - item.labels[i]) ** 2))));
  };
  const lambda = CONFIG.lambdas.reduce((best, l) => (validationError(l) < validationError(best) ? l : best));
  const fit = [...split.train, ...split.validation];
  const finalScale = scaler(fit.map(item => item.features));
  const Xf = fit.map(item => finalScale(item.features));
  const ridgeModel = ridge(Xf, Y(fit), lambda);
  const nearestModel = nearest(Xf, Y(fit));
  return { lambda, ridge: item => chainFromLabels(ridgeModel(finalScale(item.features))), nearest: item => chainFromLabels(nearestModel(finalScale(item.features))) };
}

// 4. Measurement: render the mix section with a chain, analyse it and compare with the reference.
const enabledBands = params => params.eq.left.filter(band => band.enabled);
function measure(item, params) {
  const rendered = params ? renderSegment(params, songs.get(item.song), RATE, SECTIONS[item.section]) : null;
  const processed = rendered ? analyze(rendered.channels, RATE) : null;
  const rows = compareToReference(item.refReport, item.mixReport, processed).rows;
  const key = params ? 'processedDifference' : 'originalDifference';
  const tonal = rows.filter(row => row.group === 'Tonal balance' && row[key] !== null).map(row => Math.abs(row[key]));
  const loudness = rows.find(row => row.measure === 'Integrated loudness')[key];
  return {
    tonalMeanDb: mean(tonal), tonalMaxDb: Math.max(...tonal), loudnessLu: Math.abs(loudness),
    eqCurveDb: curveErrorDb(params ? enabledBands(params) : [], item.choice.eq),
    eqShapeDb: curveErrorDb(params ? enabledBands(params) : [], item.choice.eq, { removeOffset: true }),
    inputGainDb: Math.abs((params ? params.limiter.inputGain : 0) - item.choice.inputGain),
    compressor: params ? params.compressor.enabled : false,
  };
}
const METRICS = ['tonalMeanDb', 'tonalMaxDb', 'loudnessLu', 'eqCurveDb', 'eqShapeDb', 'inputGainDb'];
const summarize = rows => Object.fromEntries(METRICS.map(m => [m, r2(mean(rows.map(r => r[m])))]));

function las32(item) {
  const renderSection = params => {
    const rendered = renderSegment(params, songs.get(item.song), RATE, SECTIONS[item.section]);
    return { report: analyze(rendered.channels, RATE), meters: rendered.meters };
  };
  return proposeChain({ reference: item.refReport, original: item.mixReport, sampleRate: RATE, renderSection }).params;
}

const groupedModels = timed('train grouped', () => trainModels(groupedItems));
const leakyModels = timed('train leaky', () => trainModels(leakyItems));
const methods = { 'no processing': () => null, 'LAS-32 deterministic': las32, 'ridge (learned)': groupedModels.ridge, '1-NN (learned)': groupedModels.nearest };
const perItem = timed('evaluate grouped', () => groupedItems.test.map(item => ({ key: item.key, song: item.song, ...Object.fromEntries(Object.entries(methods).map(([name, fn]) => [name, measure(item, fn(item))])) })));
const leakyPerItem = timed('evaluate leaky', () => leakyItems.test.map(item => ({ key: item.key, song: item.song, 'ridge (learned)': measure(item, leakyModels.ridge(item)), '1-NN (learned)': measure(item, leakyModels.nearest(item)) })));

// 5. Learning curve (label space only, no rendering): training songs vs EQ-curve and gain error.
const learningCurve = timed('learning curve', () => [3, 6, 12, 18].map(n => {
  const ids = grouped.train.slice(0, n);
  const train = items.filter(item => ids.includes(item.song));
  const scale = scaler(train.map(item => item.features));
  const Xt = train.map(item => scale(item.features)), Yt = train.map(item => item.labels);
  const models = { ridge: ridge(Xt, Yt, groupedModels.lambda), '1-NN': nearest(Xt, Yt) };
  return { trainingSongs: n, trainingItems: train.length, ...Object.fromEntries(Object.entries(models).map(([name, model]) => {
    const rows = groupedItems.test.map(item => { const params = chainFromLabels(model(scale(item.features))); return { eq: curveErrorDb(enabledBands(params), item.choice.eq), shape: curveErrorDb(enabledBands(params), item.choice.eq, { removeOffset: true }), gain: Math.abs(params.limiter.inputGain - item.choice.inputGain) }; });
    return [name, { eqCurveDb: r2(mean(rows.map(r => r.eq))), eqShapeDb: r2(mean(rows.map(r => r.shape))), inputGainDb: r2(mean(rows.map(r => r.gain))) }];
  })) };
}));

// 6. Uncertainty: song-level bootstrap of the difference to the LAS-32 baseline (negative = better).
const songDiff = (method, metric) => grouped.test.map(s => mean(perItem.filter(r => r.song === s).map(r => r[method][metric] - r['LAS-32 deterministic'][metric])));
const differences = {};
for (const method of ['ridge (learned)', '1-NN (learned)']) for (const metric of ['tonalMeanDb', 'loudnessLu', 'eqCurveDb', 'eqShapeDb']) {
  const ci = bootstrap(songDiff(method, metric), CONFIG.seed);
  differences[`${method} − LAS-32, ${metric}`] = { mean: r2(ci.mean), ci95: [r2(ci.low), r2(ci.high)] };
}

const report = {
  experiment: 'LAS-39 parameter prediction vs constrained reference matching (synthetic, known truth)',
  versions: { analysis: ANALYSIS_VERSION, proposal: PROPOSAL_VERSION, node: process.version },
  config: { ...CONFIG, rate: RATE, songSeconds: SONG_SECONDS, sections: SECTIONS, items: items.length, features: FEATURE_NAMES, labels: 'octave-average gain of the true EQ at each feature band, and the limiter input gain' },
  splits: { grouped: Object.fromEntries(Object.entries(groupedItems).map(([k, v]) => [k, { songs: grouped[k].length, items: v.length }])), groupedTestSongs: grouped.test, leaky: Object.fromEntries(Object.entries(leakyItems).map(([k, v]) => [k, { items: v.length }])) },
  leakage,
  ridgeLambda: { grouped: groupedModels.lambda, leaky: leakyModels.lambda },
  grouped: Object.fromEntries(Object.keys(methods).map(name => [name, summarize(perItem.map(r => r[name]))])),
  baselineCompressorProposed: perItem.filter(r => r['LAS-32 deterministic'].compressor).length,
  leakyInflated: Object.fromEntries(['ridge (learned)', '1-NN (learned)'].map(name => [name, summarize(leakyPerItem.map(r => r[name]))])),
  differences,
  learningCurve,
  cost: { seconds: phase, totalSeconds: Math.round((performance.now() - started) / 100) / 10, peakMemoryMiB: Math.round(process.resourceUsage().maxRSS / 1024) },
};
console.log(JSON.stringify(report, null, 1));
if (process.argv[2]) writeFileSync(process.argv[2], `${JSON.stringify({ ...report, perItem, leakyPerItem }, null, 1)}\n`);
