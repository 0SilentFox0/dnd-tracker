import { describe, expect, it } from "vitest";

import { actionExpected, externalRun, readExternalState } from "@/lib/server/assistant/execution-state";

 describe("persisted execution envelopes", () => {
  it("unwraps external preconditions while preserving legacy snapshots and JSON null", () => {
    expect(externalRun({ assistantExternalRun: "run-1", action: null })).toBe("run-1");
    expect(actionExpected({ assistantExternalRun: "run-1", action: null })).toBeNull();
    expect(actionExpected({ snapshot: "existing-hash" })).toEqual({ snapshot: "existing-hash" });
    expect(actionExpected(null)).toBeNull();
  });

  it("reads legacy effects without external state and retains a null external result", () => {
    expect(readExternalState({ items: [], completed: [] })).toBeUndefined();
    expect(readExternalState({ items: [], completed: [], external: { phase: "started", runId: "run-1" } })).toEqual({ phase: "started", runId: "run-1" });
    expect(readExternalState({ items: [], completed: [], external: { phase: "result", runId: "run-1", result: null } })).toEqual({ phase: "result", runId: "run-1", result: null });
  });

  it.each([null, [], "external", { external: null }, { items: [], completed: [], external: { phase: "paid", runId: "run-1" } }, { items: [], completed: [], external: { phase: "result", runId: 1 } }, { external: { phase: "result", runId: "run-1", result: null } }].map(value => ({ value })))("ignores malformed persisted envelopes: $value", ({ value }) => {
    expect(readExternalState(value)).toBeUndefined();
  });
});
