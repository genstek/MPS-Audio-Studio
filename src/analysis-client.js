// Starts an analysis in a Web Worker (LAS-26). Returns { result, cancel }: result resolves with the
// report or rejects with an Error whose message can be shown; cancel() stops the work at once.
// `segment` ({ start, end } in seconds) measures part of the file.
export function startAnalysis(file, onProgress, segment) {
  const worker = new Worker(new URL('./dsp/analysis.worker.js', import.meta.url), { type: 'module' });
  let settle;
  const result = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });
  const finish = () => worker.terminate();
  worker.onmessage = ({ data }) => {
    if (data.type === 'progress') return onProgress(data.stage);
    finish();
    if (data.type === 'done') settle.resolve(data.report);
    else settle.reject(new Error(data.message));
  };
  worker.onerror = event => {
    event.preventDefault();
    finish();
    settle.reject(new Error('Analysis failed unexpectedly. Try again.'));
  };
  worker.postMessage({ file, segment });
  return {
    result,
    cancel() {
      finish();
      const cancelled = new Error('Analysis cancelled.');
      cancelled.name = 'AbortError';
      settle.reject(cancelled);
    },
  };
}
