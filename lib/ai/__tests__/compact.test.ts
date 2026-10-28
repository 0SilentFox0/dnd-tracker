import { describe, expect, it } from "vitest";

import { compactToolOutputs } from "@/lib/ai/compact";

const big = "x".repeat(5000);

const msg = (id: string, output: unknown = big) => ({ id, role: "assistant" as const, parts: [{ type: "tool-read_scenario_page", output }, { type: "tool-propose_scenario_edit", output: '{"proposalId":"ap1"}' }] as unknown[], metadata: {} });

describe("compactToolOutputs", () => {
  it("minChars compacts only long string outputs in old messages", () => {
    const out = compactToolOutputs(Array.from({ length: 10 }, (_, i) => msg(`m${i}`)) as never, { minChars: 2000 });

    expect((out[0].parts[0] as { output: string }).output).toContain("стиснуто");
    expect((out[0].parts[1] as { output: string }).output).toBe('{"proposalId":"ap1"}');
    expect((out[9].parts[0] as { output: string }).output).toBe(big);
  });

  it("without minChars compacts every old output", () => {
    const out = compactToolOutputs(Array.from({ length: 10 }, (_, i) => msg(`m${i}`, { a: 1 })) as never);

    expect(JSON.stringify(out[0])).not.toContain('"a":1');
    expect(JSON.stringify(out[9])).toContain('"a":1');
  });
});
