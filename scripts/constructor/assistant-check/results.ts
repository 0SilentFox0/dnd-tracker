import { z } from "zod";

const count = z.number().int().nonnegative();

const reportSchema = z.object({ success: z.literal(true), numTotalTests: count.positive(), numPassedTests: count, numFailedTests: count, numPendingTests: count, numTodoTests: count });

export function integrationCounts(raw: unknown) {
  const parsed = reportSchema.safeParse(raw);

  if (!parsed.success) throw new Error("ASSISTANT_INTEGRATION_REPORT_FAILED");

  const report = parsed.data;

  const counts = { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests + report.numTodoTests };

  if (counts.passed !== counts.total || counts.failed || counts.skipped) throw new Error("ASSISTANT_INTEGRATION_REPORT_FAILED");

  return counts;
}
