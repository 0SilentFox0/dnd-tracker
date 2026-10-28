import { performance } from "node:perf_hooks";

import type { BenchmarkSample } from "./benchmark-report";

import { contentDeleteCascades, contentDependencies } from "@/lib/server/assistant/actions/content-dependencies";

/** 100 calls per sample amortize timer noise. Same locked synthetic snapshot;
 * no DB, JSON serialization, state mutation or per-call global row cache. */
export function measureTraversal(state: unknown, size: "small" | "large", id: string): BenchmarkSample[] {
  const samples: BenchmarkSample[] = [];

  for (const [scenario, invoke] of [
    ["cpu.dependencies", () => contentDependencies(state, "spells", id, null)],
    ["cpu.cascades", () => contentDeleteCascades(state, "spells", [id])],
  ] as const) {
    for (let iteration = -5; iteration < 30; iteration++) {
      const started = performance.now();

      for (let repeat = 0; repeat < 100; repeat++) invoke();

      const elapsedMs = (performance.now() - started) / 100;

      if (iteration >= 0) samples.push({ scenario, size, elapsedMs, queryCount: 0, resultJsonBytes: 0 });
    }
  }

  return samples;
}
