import { describe, expect, it } from "vitest";

import { type BenchmarkSample, summarizeSamples } from "../benchmark-report";

describe("benchmark samples", () => {
  const samples = [1, 2, 3, 4, 5].map(elapsedMs => ({ scenario: "rules.update", size: "small", queryCount: 1, resultJsonBytes: 2, elapsedMs }) satisfies BenchmarkSample);

  it("uses median and nearest-rank p95 without mutating samples", () => {
    expect(summarizeSamples([...samples].reverse())).toEqual({ count: 5, medianMs: 3, p95Ms: 5 });
    expect(summarizeSamples(samples.slice(0, 4))).toEqual({ count: 4, medianMs: 2.5, p95Ms: 4 });
  });

  it("rejects empty or invalid measurements", () => {
    expect(() => summarizeSamples([])).toThrow("ASSISTANT_BENCHMARK_EMPTY");
    expect(() => summarizeSamples([{ ...samples[0], elapsedMs: NaN }])).toThrow("ASSISTANT_BENCHMARK_INVALID_SAMPLE");
  });
});
