/**
 * Розмір логу бою: M1 = log / uk-рендер, M2 = (log + resultText) / resultText.
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/sim/log-size.ts --since <ISO> [--cleanup]
 * Читає бої `ТЕСТ …`, створені після --since (battle-sweep --keep-battles); --cleanup видаляє їх.
 */
import { prisma } from "@/lib/db";
import { decodeStoredLog } from "@/lib/utils/battle/log/codec";
import { resultTextOf } from "@/scripts/sim/log-text";
import type { LogLine } from "@/types/text";

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
  console.error("log-size: лише локальна БД (DATABASE_URL на localhost).");
  process.exit(1);
}

const argv = process.argv.slice(2);

const sinceArg = argv[argv.indexOf("--since") + 1];

const since = argv.includes("--since") ? new Date(sinceArg) : undefined;

if (!since || Number.isNaN(since.getTime())) {
  console.error("log-size: потрібен --since <ISO>.");
  process.exit(1);
}

const bytes = (s: string) => Buffer.byteLength(s, "utf8");

const quantile = (xs: number[], q: number) => {
  const sorted = [...xs].sort((a, b) => a - b);

  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
};

const fmt = (n: number) => n.toFixed(n >= 100 ? 0 : 2);

async function main() {
  const battles = await prisma.battleScene.findMany({ where: { name: { startsWith: "ТЕСТ" }, createdAt: { gte: since } }, select: { id: true } });

  const ids = battles.map((b) => b.id);

  const events = await prisma.battleEvent.findMany({ where: { battleId: { in: ids } }, select: { type: true, details: true, resultText: true } });

  let logSum = 0;

  let ukSum = 0;

  let textSum = 0;

  let counted = 0;

  const perType = new Map<string, number[]>();

  const perKey = new Map<string, number>();

  for (const e of events) {
    const stored = (e.details as { log?: LogLine[] }).log;

    if (!stored?.length) continue;

    const log = decodeStoredLog(e.details) ?? [];

    const logBytes = bytes(JSON.stringify(stored));

    logSum += logBytes;
    ukSum += bytes(resultTextOf({ log }));
    textSum += bytes(e.resultText);
    counted++;

    perType.set(e.type, [...(perType.get(e.type) ?? []), logBytes]);

    for (const line of log) {
      const key = typeof line === "string" ? "(string)" : line.message;

      perKey.set(key, (perKey.get(key) ?? 0) + bytes(JSON.stringify(line)));
    }
  }

  console.log(`battles=${ids.length} events=${events.length} withLog=${counted}`);
  console.log(`Σlog=${logSum} Σuk=${ukSum} Σresult_text=${textSum}`);
  console.log(`M1 = log/uk = ${(logSum / ukSum).toFixed(3)}`);
  console.log(`M2 = (log+result_text)/result_text = ${((logSum + textSum) / textSum).toFixed(3)}`);
  console.log("\ntype\tn\tmedian\tp95");

  for (const [type, xs] of [...perType].sort((a, b) => b[1].length - a[1].length)) console.log(`${type}\t${xs.length}\t${fmt(quantile(xs, 0.5))}\t${fmt(quantile(xs, 0.95))}`);

  console.log("\ntop-10 message за байтами");

  for (const [key, b] of [...perKey].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`${b}\t${key}`);

  if (argv.includes("--cleanup")) {
    await prisma.battleScene.deleteMany({ where: { id: { in: ids } } });
    console.log(`\nвидалено боїв: ${ids.length}`);
  }
}

main().finally(() => prisma.$disconnect());
