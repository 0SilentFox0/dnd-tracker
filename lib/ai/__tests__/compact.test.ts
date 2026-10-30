import { describe, expect, it } from "vitest";

import { compactToolOutputs } from "@/lib/ai/compact";

const big = "x".repeat(5000);

const msg = (id: string, output: unknown = big) => ({ id, role: "assistant" as const, parts: [{ type: "tool-read_scenario_page", output }, { type: "tool-propose_scenario_edit", output: '{"proposalId":"ap1"}' }] as unknown[], metadata: {} });

describe("compactToolOutputs", () => {
  it("minChars compacts only long string outputs in old messages", () => {
    const out = compactToolOutputs(Array.from({ length: 10 }, (_, i) => msg(`m${i}`)) as never, { minChars: 2000 });

    expect((out[0].parts[0] as { output: string }).output).toContain("compacted");
    expect((out[0].parts[1] as { output: string }).output).toBe('{"proposalId":"ap1"}');
    expect((out[9].parts[0] as { output: string }).output).toBe(big);
  });

  it("without minChars compacts every old output", () => {
    const out = compactToolOutputs(Array.from({ length: 10 }, (_, i) => msg(`m${i}`, { a: 1 })) as never);

    expect(JSON.stringify(out[0])).not.toContain('"a":1');
    expect(JSON.stringify(out[9])).toContain('"a":1');
  });

  describe("keep", () => {
    const keep = { tools: ["read_scenario_page", "find_scenario_mentions"], maxChars: 40_000 };

    const text = (m: { parts: unknown[] }, j = 0) => (m.parts[j] as { output: unknown }).output;

    it("keeps reading results of old messages within the cap, newest first", () => {
      const out = compactToolOutputs(Array.from({ length: 12 }, (_, i) => msg(`m${i}`)) as never, { keep });

      expect(text(out[5])).toBe(big);
      expect(text(out[4])).toBe(big);
      expect(text(out[3])).toContain("compacted");
      expect(text(out[0])).toContain("compacted");
    });

    it("counts recent messages against the cap", () => {
      const out = compactToolOutputs(Array.from({ length: 12 }, (_, i) => msg(`m${i}`)) as never, { keep: { ...keep, maxChars: 30_000 } });

      expect(out.slice(6).every((m) => text(m) === big)).toBe(true);
      expect(text(out[5])).toContain("compacted");
    });

    it("overrides minChars, measures object outputs and leaves other tools compacted", () => {
      const obj = { hits: ["y".repeat(3000)] };

      const old = { id: "o", role: "assistant" as const, parts: [{ type: "tool-find_scenario_mentions", output: obj }, { type: "tool-list_scenario_pages", output: big }] as unknown[], metadata: {} };

      const out = compactToolOutputs([old, ...Array.from({ length: 6 }, (_, i) => msg(`m${i}`, "s"))] as never, { minChars: 2000, keep: { ...keep, maxChars: 5000 } });

      expect(text(out[0])).toEqual(obj);
      expect(text(out[0], 1)).toContain("compacted");
    });

    it("compacts an oversized single result", () => {
      const out = compactToolOutputs(Array.from({ length: 8 }, (_, i) => msg(`m${i}`)) as never, { keep: { ...keep, maxChars: 1000 } });

      expect(text(out[0])).toContain("compacted");
      expect(text(out[7])).toBe(big);
    });
  });
});
