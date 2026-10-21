type PerfMetric = { name: string; duration: number; at: number };

const PERF_STORE_KEY = '__MY_CAPITAL_PERF__';

declare global {
  interface Window {
    [PERF_STORE_KEY]?: PerfMetric[];
  }
}

function getPerfStore(): PerfMetric[] | null {
  if (typeof window === 'undefined') return null;
  window[PERF_STORE_KEY] ||= [];
  return window[PERF_STORE_KEY] ?? null;
}

export function markPerf(name: string): void {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
  performance.mark(name);
}

export function measurePerf(name: string, startMark: string, endMark?: string): PerfMetric | null {
  if (typeof performance === 'undefined' || typeof performance.measure !== 'function') return null;

  try {
    if (endMark) markPerf(endMark);
    performance.measure(name, startMark, endMark);
    const entry = performance.getEntriesByName(name).at(-1);
    const metric: PerfMetric | null = entry
      ? { name, duration: Math.round(entry.duration), at: Math.round(performance.now()) }
      : null;
    const store = getPerfStore();
    if (metric && store) {
      store.push(metric);
      if (store.length > 40) store.shift();
    }
    return metric;
  } catch {
    return null;
  }
}

export function readPerfMetrics(): PerfMetric[] {
  return getPerfStore() || [];
}
