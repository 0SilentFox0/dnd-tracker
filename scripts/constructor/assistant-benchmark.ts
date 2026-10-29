import { Prisma, PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { BENCHMARK_SCENARIOS, benchmarkFixtures, FIXTURE_CLOCK, FIXTURE_SIZES } from "./assistant-check/benchmark-fixtures";
import { type BenchmarkSample, summarizeSamples } from "./assistant-check/benchmark-report";
import { measureTraversal } from "./assistant-check/benchmark-traversal";
import { findRunManifests, initManifest, MANIFEST_FILE, retireManifest, trackFixture } from "./assistant-check/manifest";
import { recoverRun } from "./assistant-check/recover";

import { constructorDatabaseTarget } from "@/lib/server/assistant/test-support";
import { runContentWriteContext } from "@/lib/server/content/write-context";

async function main() {
  const recover = process.argv[2] === "--recover";

  if (process.argv.length !== 5 || (process.argv[2] !== "--run" && !recover) || process.argv[3] !== "--output-dir") throw new Error("ASSISTANT_BENCHMARK_INVALID_OPTIONS");

  const outputRoot = path.resolve(process.argv[4]);

  // Output is evidence, never a source or checked-in fixture directory.
  const ignored = execFileSync("git", ["check-ignore", outputRoot], { encoding: "utf8" }).trim();

  if (!ignored || !path.relative(path.resolve(".superpowers"), outputRoot).match(/^(?!\.\.)(?!\/).+/)) throw new Error("ASSISTANT_BENCHMARK_OUTPUT_MUST_BE_IGNORED");

  const target = constructorDatabaseTarget({ DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL });

  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const url = new URL(process.env[key] ?? "");

    url.searchParams.set("connection_limit", "1");
    process.env[key] = url.toString();
  }

  const marker = process.env.ASSISTANT_BENCHMARK_RUN_ID ?? "";

  if (!/^s3-bench-[a-z0-9-]{8,32}$/.test(marker)) throw new Error("ASSISTANT_BENCHMARK_INVALID_MARKER");

  const existing = findRunManifests(outputRoot, marker);

  if (recover) {
    if (existing.length !== 1) throw new Error("ASSISTANT_BENCHMARK_RECOVER_MANIFEST_NOT_UNIQUE");

    const url = new URL(process.env.DATABASE_URL ?? "");

    const recoveryDb = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });

    try {
      const result = await recoverRun(existing[0], { db: recoveryDb });

      process.stdout.write(`${JSON.stringify(result)}\n`);

      if (!result.ok) process.exitCode = 1;
    } finally { await recoveryDb.$disconnect(); }

    return;
  }

  if (existing.length) throw new Error("ASSISTANT_BENCHMARK_REQUIRES_RECOVER");

  mkdirSync(outputRoot, { recursive: true });

  const dir = mkdtempSync(path.join(outputRoot, `${marker}-`));

  const manifestFile = path.join(dir, MANIFEST_FILE);

  initManifest(manifestFile, marker);

  const base = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } }, log: [{ level: "query", emit: "event" }] });

  let active: { queryCount: number; resultJsonBytes: number; serializeMs: number; queryKinds: Record<string, number> } | null = null;

  base.$on("query", event => {
    if (!active) return;

    active.queryCount++;

    const kind = /^SELECT 1\s*;?$/i.test(event.query.trim()) ? "pool-probe" : /^(BEGIN|COMMIT|ROLLBACK|SELECT|SET)\b/i.exec(event.query.trim())?.[1].toUpperCase() ?? "other";

    active.queryKinds[kind] = (active.queryKinds[kind] ?? 0) + 1;
  });

  // Observe only this owned client's returned results, including raw lock reads.
  // No query text, parameters, result objects or credentials enter evidence.
  const db = base.$extends({ query: { $allOperations: async ({ args, query }) => {
    const result = await query(args);

    if (active) {
      const started = performance.now();

      active.resultJsonBytes += Buffer.byteLength(JSON.stringify(result, (_key, value) => typeof value === "bigint" ? value.toString() : value) ?? "null");
      active.serializeMs += performance.now() - started;
    }

    return result;
  } } });

  // Import production paths only after both-URL guard and pool configuration.
  const { CONTENT_ACTIONS } = await import("@/lib/server/assistant/actions/content");

  const { prisma } = await import("@/lib/db");

  const listMigrations = async () => (await db.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`).map(row => row.migration_name);

  const samples: BenchmarkSample[] = [];

  const cpuSamples: BenchmarkSample[] = [];

  const cleanupResults: number[][] = [];

  try {
    const migrationsBefore = await listMigrations();

    if (!migrationsBefore.includes("20261108000000_assistant_intents")) throw new Error("ASSISTANT_MIGRATION_NOT_APPLIED");

    const postgres = await db.$queryRaw<Array<{ version: string }>>`SELECT version()`;

    for (const size of ["small", "large"] as const) {
      // Extension preserves Prisma's model API; the narrowed cast is harness-only.
      const fixture = benchmarkFixtures(db as unknown as PrismaClient, marker, size, (kind, id) => trackFixture(manifestFile, kind, id));

      try {
        const inputs = await fixture.seed();

        for (const scenario of BENCHMARK_SCENARIOS) {
          const action = CONTENT_ACTIONS.find(action => action.id === scenario);

          if (!action || action.effect !== "write") throw new Error("ASSISTANT_BENCHMARK_ACTION_MISSING");

          for (let iteration = -5; iteration < 30; iteration++) {
            // prepare does not mutate content; no per-iteration fixture reset needed.
            // Prisma query events arrive asynchronously after query promises.
            // Drain them outside the timed interval on this otherwise idle client.
            await new Promise(resolve => setTimeout(resolve, 50));

            const metrics = { queryCount: 0, resultJsonBytes: 0, serializeMs: 0, queryKinds: {} as Record<string, number> };

            active = metrics;

            const started = performance.now();

            let elapsedMs: number;

            try {
              await db.$transaction(async tx => {
                await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${fixture.campaignId} FOR UPDATE`;

                return runContentWriteContext(fixture.campaignId, tx, () => action.prepare(fixture.caller, action.input.parse(inputs[scenario])));
              }, { timeout: 30_000, maxWait: 5_000 });
              elapsedMs = performance.now() - started;
              await new Promise(resolve => setTimeout(resolve, 50));
            } finally { active = null; }

            if (iteration >= 0) samples.push({ scenario, size, ...metrics, elapsedMs });
          }
        }

        const { contentSnapshot } = await import("@/lib/server/assistant/actions/content-snapshot");

        const state = await db.$transaction(async tx => {
          await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${fixture.campaignId} FOR UPDATE`;

          return runContentWriteContext(fixture.campaignId, tx, () => contentSnapshot(fixture.caller.actor));
        });

        cpuSamples.push(...measureTraversal(state, size, (inputs["content.spells.delete"] as { id: string }).id));
      } finally { cleanupResults.push(await fixture.cleanup()); }
    }

    const migrationsAfter = await listMigrations();

    if (JSON.stringify(migrationsBefore) !== JSON.stringify(migrationsAfter)) throw new Error("ASSISTANT_MIGRATION_LIST_CHANGED");

    const summaries = Object.keys(FIXTURE_SIZES).flatMap(size => BENCHMARK_SCENARIOS.map(scenario => {
      const selected = samples.filter(sample => sample.size === size && sample.scenario === scenario);

      return { size, scenario, ...summarizeSamples(selected), queryCounts: [...new Set(selected.map(sample => sample.queryCount))], resultJsonBytes: [...new Set(selected.map(sample => sample.resultJsonBytes))] };
    }));

    const report = {
      target, connectionLimit: 1, marker, head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      productionBlobs: Object.fromEntries(["lib/server/assistant/actions/content-dependencies.ts", "lib/server/assistant/actions/content-snapshot.ts", "lib/server/assistant/json.ts", "lib/utils/common/json.ts", "lib/utils/battle/store/stable-json.ts"].map(file => [file, execFileSync("git", ["hash-object", file], { encoding: "utf8" }).trim()])),
      dirtyPaths: execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim().split("\n").filter(Boolean),
      versions: { node: process.version, prisma: Prisma.prismaVersion.client, pnpm: execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim(), postgres: postgres[0].version },
      fixtures: FIXTURE_SIZES, source: { spells: 1, artifacts: 0, characters: 0 }, fixtureClock: FIXTURE_CLOCK.toISOString(), warmups: 5, iterations: 30,
      methodology: "Sequential current action.prepare inside campaign-locked scoped transaction; no executor/auth/intent writes. queryCount: owned Prisma query events, including transaction/lock statements. resultJsonBytes: sum of UTF-8 JSON sizes of returned model/raw query results, NOT PostgreSQL network traffic. serializeMs: separately timed harness result serialization included in elapsedMs. elapsedMs: entire transaction call including commit and instrumentation. prepare is read-only: seed/size checks/source diff/cleanup/migration reads are outside measured intervals. Fixed logical rows/IDs/clock across runs via same explicit marker. transactionMs, lock wait/duration, snapshot/hash CPU and PostgreSQL wire bytes unavailable.",
      migrationsBefore, migrationsAfter, cleanupResults, summaries, samples, cpuSamples,
    };

    writeFileSync(path.join(dir, "samples.json"), JSON.stringify(report, null, 2));
    retireManifest(manifestFile, "completed");
    process.stdout.write(`${JSON.stringify({ output: dir, summaries, cleanupResults })}\n`);
  } finally {
    await base.$disconnect();
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  process.stderr.write("ASSISTANT_BENCHMARK_FAILED (no query parameters or payloads logged)\n");
  process.exitCode = 1;
});
