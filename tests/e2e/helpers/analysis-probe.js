// Lets a test act while an analysis is still running: on request, the final message of every Web
// Worker (its result or error) is held back until released. Progress messages pass through.
// It also records main-thread long tasks, to check the page stays responsive during analysis.
export async function installAnalysisProbe(page) {
  await page.addInitScript(() => {
    const probe = { held: false, queue: [], longTasks: [] };
    window.__analysisProbe = probe;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) probe.longTasks.push({ start: entry.startTime, duration: entry.duration });
    }).observe({ type: 'longtask', buffered: true });
    const PageWorker = window.Worker;
    window.Worker = class extends PageWorker {
      constructor(...args) {
        super(...args);
        // Registered before the page's own handler, so it can stop a final message reaching it.
        this.addEventListener('message', event => {
          if (!probe.held || event.released || event.data?.type === 'progress') return;
          event.stopImmediatePropagation();
          probe.queue.push({ worker: this, data: event.data });
        });
      }
    };
  });
}

export function holdAnalysisResults(page) {
  return page.evaluate(() => { window.__analysisProbe.held = true; });
}

// Delivers the held messages, including those of workers the page has since terminated.
export function releaseAnalysisResults(page) {
  return page.evaluate(() => {
    const probe = window.__analysisProbe;
    probe.held = false;
    for (const { worker, data } of probe.queue.splice(0)) {
      const event = new MessageEvent('message', { data });
      event.released = true;
      worker.dispatchEvent(event);
    }
  });
}

export function heldAnalysisResults(page) {
  return page.evaluate(() => window.__analysisProbe.queue.map(({ data }) => data.type));
}

// Long tasks (≥ 50 ms, as reported by the browser) that started after `since` (performance.now()).
export function longTasksSince(page, since) {
  return page.evaluate(start => window.__analysisProbe.longTasks.filter(task => task.start >= start), since);
}
