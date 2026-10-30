// Starts an offline render in a Web Worker (LAS-28): mode 'export', 'match' or 'compare' (LAS-31,
// with segment { start, end } in seconds). Returns
// { result, cancel }: result resolves with { report, bytes } or rejects with a showable Error;
// cancel() stops the work at once (AbortError).
export function startRender(file, { mode, params, bitDepth, segment }, onProgress = () => {}) {
  const worker = new Worker(new URL('./dsp/render.worker.js', import.meta.url), { type: 'module' });
  let settle;
  const result = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const finish = () => worker.terminate();
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') return onProgress(data);
    finish();
    if (data.type === 'done') settle.resolve({ report: data.report, bytes: data.bytes });
    else settle.reject(new Error(data.message));
  };
  worker.onerror = event => {
    event.preventDefault();
    finish();
    settle.reject(new Error('Rendering failed unexpectedly. Try again.'));
  };
  worker.postMessage({ mode, file, params, bitDepth, segment });
  return {
    result,
    cancel() {
      finish();
      const cancelled = new Error('Cancelled.');
      cancelled.name = 'AbortError';
      settle.reject(cancelled);
    },
  };
}
