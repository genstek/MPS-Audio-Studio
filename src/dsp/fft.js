// In-place iterative radix-2 FFT on separate real and imaginary arrays (length a power of two).
// Twiddle factors are computed once per length.
const tables = new Map();

function twiddles(n) {
  if (!tables.has(n)) {
    const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
    for (let k = 0; k < n / 2; k++) {
      cos[k] = Math.cos((-2 * Math.PI * k) / n);
      sin[k] = Math.sin((-2 * Math.PI * k) / n);
    }
    tables.set(n, { cos, sin });
  }
  return tables.get(n);
}

export function fft(re, im) {
  const n = re.length;
  const { cos, sin } = twiddles(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let swap = re[i]; re[i] = re[j]; re[j] = swap;
      swap = im[i]; im[i] = im[j]; im[j] = swap;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size / 2, step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const a = start + k, b = a + half;
        const cr = cos[k * step], ci = sin[k * step];
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}
