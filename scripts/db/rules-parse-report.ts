#!/usr/bin/env tsx
/**
 * Read-only: порівнює замороженний legacyParseRules і живий parseRules для campaigns.rules (і data/templates, rules.json).
 * Код виходу 0 лише без незапланованих розбіжностей.
 *
 *   pnpm rules:parse-report [--templates] [--json] [--allow-remote]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { reportRules, type RulesReport,summarize } from "@/scripts/db/lib/rules-parse-diff";
import { assertSeedTarget } from "@/scripts/seed/seed-library-lib";

const flags = new Set(process.argv.slice(2));

const templateReports = (): RulesReport[] => {
  const root = join(process.cwd(), "data/templates");

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      try {
        return [reportRules(entry.name, "template", JSON.parse(readFileSync(join(root, entry.name, "rules.json"), "utf8")))];
      } catch {
        return [];
      }
    });
};

async function campaignReports(): Promise<RulesReport[]> {
  assertSeedTarget(process.env.DATABASE_URL, flags.has("--allow-remote"));

  const { prisma } = await import("@/lib/db");

  try {
    const rows = await prisma.campaign.findMany({ select: { id: true, rules: true } });

    return rows.map((row) => reportRules(row.id, "campaign", row.rules));
  } finally {
    await prisma.$disconnect();
  }
}

const print = (reports: RulesReport[], summary: ReturnType<typeof summarize>) => {
  for (const report of reports) {
    for (const difference of report.differences) {
      const label = difference.byDesign ? `by design (${difference.byDesign})` : "НЕПОЯСНЕНО";

      console.log(`${report.source} ${report.id} [${report.system}] ${difference.path}: ${label}`);
      console.log(`  було:  ${JSON.stringify(difference.legacy)}`);
      console.log(`  стало: ${JSON.stringify(difference.next)}`);
    }
  }

  for (const [path, counts] of Object.entries(summary.perPath)) console.log(`${path}: by design ${counts.byDesign}, непояснено ${counts.unexplained}`);

  console.log(`перевірено ${summary.total} · by design ${summary.byDesign} · непояснено ${summary.unexplained}`);
};

async function main() {
  const reports = [...(await campaignReports()), ...(flags.has("--templates") ? templateReports() : [])];

  const summary = summarize(reports);

  if (flags.has("--json")) console.log(JSON.stringify({ summary, reports: reports.filter((r) => r.differences.length > 0) }, null, 2));
  else print(reports, summary);

  process.exitCode = summary.unexplained === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "помилка");
  process.exitCode = 1;
});
