import { describe, expect, it } from "vitest";

import { integrationCounts } from "../results";

describe("assistant verification results", () => {
  it("reports actual passed counts instead of a fixed six tests", () => {
    expect(integrationCounts({ success: true, numTotalTests: 8, numPassedTests: 8, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0 })).toEqual({ total: 8, passed: 8, failed: 0, skipped: 0 });
  });

  it("never treats exit-zero skipped, empty or malformed reports as verification", () => {
    for (const report of [
      { success: true, numTotalTests: 6, numPassedTests: 5, numFailedTests: 0, numPendingTests: 1, numTodoTests: 0 },
      { success: true, numTotalTests: 0, numPassedTests: 0, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0 },
      { success: false, numTotalTests: 6, numPassedTests: 5, numFailedTests: 1, numPendingTests: 0, numTodoTests: 0 },
      {},
    ]) expect(() => integrationCounts(report)).toThrow("ASSISTANT_INTEGRATION_REPORT_FAILED");
  });
});
