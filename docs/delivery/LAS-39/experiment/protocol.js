// Leakage-safe evaluation protocol and two small learned models for LAS-39 (no dependencies).
import { random } from './data.js';

// Split by song: every section and decision of a song lands in one split only.
export function splitBySong(songIds, { train, validation }, seed) {
  const order = shuffle(songIds, seed);
  return { train: order.slice(0, train), validation: order.slice(train, train + validation), test: order.slice(train + validation) };
}

// The deliberately leaky split used only to show the inflation: items shuffled individually, so
// sibling sections and other decisions of the same song land in training and test.
export function splitByItem(items, { train, validation }, seed) {
  const order = shuffle(items.map(item => item.key), seed);
  return { train: order.slice(0, train), validation: order.slice(train, train + validation), test: order.slice(train + validation) };
}

export function shuffle(values, seed) {
  const rnd = random(seed);
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Checks run before any model is trained: songs shared between splits, and identical feature
// vectors across splits (duplicate items).
export function leakageReport(groups) {
  const names = Object.keys(groups);
  const sharedSongs = [], duplicateFeatures = [];
  for (let a = 0; a < names.length; a++) {
    for (let b = a + 1; b < names.length; b++) {
      const songsA = new Set(groups[names[a]].map(item => item.song));
      const shared = [...new Set(groups[names[b]].map(item => item.song))].filter(song => songsA.has(song));
      if (shared.length) sharedSongs.push({ splits: [names[a], names[b]], songs: shared.length });
      const seen = new Set(groups[names[a]].map(item => item.features.join(',')));
      const dupes = groups[names[b]].filter(item => seen.has(item.features.join(','))).length;
      if (dupes) duplicateFeatures.push({ splits: [names[a], names[b]], items: dupes });
    }
  }
  return { sharedSongs, duplicateFeatures, clean: !sharedSongs.length && !duplicateFeatures.length };
}

// Feature scaling fitted on the training items only.
export function scaler(rows) {
  const p = rows[0].length;
  const mean = Array.from({ length: p }, (_, j) => rows.reduce((s, r) => s + r[j], 0) / rows.length);
  const std = Array.from({ length: p }, (_, j) => Math.sqrt(rows.reduce((s, r) => s + (r[j] - mean[j]) ** 2, 0) / rows.length) || 1);
  return row => row.map((v, j) => (v - mean[j]) / std[j]);
}

// Solves A x = b for several right-hand sides (Gaussian elimination, partial pivoting).
function solve(A, B) {
  const n = A.length, m = B[0].length;
  const M = A.map((row, i) => [...row, ...B[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    [M[c], M[pivot]] = [M[pivot], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < n + m; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row.slice(n).map(v => v / M[i][i]));
}

// Ridge regression with an unpenalized intercept; X rows are already scaled.
export function ridge(X, Y, lambda) {
  const rows = X.map(r => [1, ...r]);
  const p = rows[0].length;
  const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => rows.reduce((s, r) => s + r[i] * r[j], 0) + (i === j && i > 0 ? lambda : 0)));
  const B = Array.from({ length: p }, (_, i) => Y[0].map((_, k) => rows.reduce((s, r, n) => s + r[i] * Y[n][k], 0)));
  const W = solve(A, B);
  return x => W[0].map((_, k) => W.reduce((s, w, i) => s + w[k] * (i === 0 ? 1 : x[i - 1]), 0));
}

// One nearest neighbour in scaled feature space: copies the closest training item's labels.
export function nearest(X, Y) {
  return x => {
    let best = 0, bestDistance = Infinity;
    X.forEach((row, i) => {
      const d = row.reduce((s, v, j) => s + (v - x[j]) ** 2, 0);
      if (d < bestDistance) { bestDistance = d; best = i; }
    });
    return [...Y[best]];
  };
}

// Song-level bootstrap of a mean difference: songs resampled with replacement.
export function bootstrap(perSong, seed, resamples = 2000) {
  const rnd = random(seed);
  const means = [];
  for (let b = 0; b < resamples; b++) {
    let sum = 0;
    for (let i = 0; i < perSong.length; i++) sum += perSong[Math.floor(rnd() * perSong.length)];
    means.push(sum / perSong.length);
  }
  means.sort((a, b) => a - b);
  return { mean: perSong.reduce((s, v) => s + v, 0) / perSong.length, low: means[Math.floor(0.025 * resamples)], high: means[Math.floor(0.975 * resamples)] };
}
