export type BenchmarkSample = {
  scenario: string;
  size: "small" | "large";
  queryCount: number;
  resultJsonBytes: number;
  elapsedMs: number;
  serializeMs?: number;
  transactionMs?: number;
};

export function summarizeSamples(samples: readonly BenchmarkSample[]) {
  if (!samples.length) throw new Error("ASSISTANT_BENCHMARK_EMPTY");

  if (samples.some(sample => !Number.isFinite(sample.elapsedMs) || sample.elapsedMs < 0)) throw new Error("ASSISTANT_BENCHMARK_INVALID_SAMPLE");

  const times = samples.map(sample => sample.elapsedMs).sort((a, b) => a - b);

  const count = times.length;

  return { count, medianMs: (times[Math.floor((count - 1) / 2)] + times[Math.floor(count / 2)]) / 2, p95Ms: times[Math.ceil(count * 0.95) - 1] };
}
