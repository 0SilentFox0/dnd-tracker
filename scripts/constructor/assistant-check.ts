import { PrismaClient } from "@prisma/client";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { assistantCheckPreflight, browserSources } from "./assistant-check/preflight";
import { integrationCounts } from "./assistant-check/results";

import { constructorDatabaseTarget } from "@/lib/server/assistant/test-support";

async function main() {
  const mode = process.argv[2];

  if (mode === "--check-target") {
    try {
      process.stdout.write(`${JSON.stringify(constructorDatabaseTarget({ DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL }))}\n`);

      return;
    } catch {
      process.stderr.write("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR\n");
      process.exitCode = 2;

      return;
    }
  }

  if (mode !== "--run") {
    process.stderr.write("Expected --check-target or --run\n");
    process.exitCode = 2;

    return;
  }

  constructorDatabaseTarget({ DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL });

  const { outputRoot, chromePath } = assistantCheckPreflight(process.argv.slice(3));

  const runId = process.env.ASSISTANT_CHECK_RUN_ID;

  if (!runId || !/^[a-zA-Z0-9-]{12,80}$/.test(runId)) {
    process.stderr.write("ASSISTANT_CHECK_RUN_ID must be an explicit non-secret marker\n");
    process.exitCode = 2;

    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

  const url = new URL(databaseUrl);

  const directUrl = process.env.DIRECT_URL;

  if (!directUrl) throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

  const direct = new URL(directUrl);

  url.searchParams.set("connection_limit", "1");
  direct.searchParams.set("connection_limit", "1");
  process.env.DATABASE_URL = url.toString();
  process.env.DIRECT_URL = direct.toString();

  const db = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });

  try {
    const listMigrations = async () => (await db.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`).map(row => row.migration_name);

    const before = await listMigrations();

    if (!before.includes("20261108000000_assistant_intents")) throw new Error("ASSISTANT_MIGRATION_NOT_APPLIED");

    mkdirSync(outputRoot, { recursive: true });

    const dir = mkdtempSync(path.join(outputRoot, `${runId}-`));

    process.stderr.write(`ASSISTANT_CHECK_OUTPUT=${dir}\n`);

    const test = spawnSync("pnpm", ["exec", "vitest", "run", "--config", "vitest.integration.config.mts", "--reporter=default", "--reporter=json", `--outputFile=${path.join(dir, "integration.json")}`, "lib/server/assistant/__tests__/execution.integration.test.ts"], {
      cwd: process.cwd(), encoding: "utf8", env: { ...process.env, ASSISTANT_CHECK_RUN_ID: runId }, maxBuffer: 10 * 1024 * 1024, timeout: 180_000,
    });

    writeFileSync(path.join(dir, "integration.log"), `${test.stdout ?? ""}${test.stderr ?? ""}`);

    if (test.status !== 0) throw new Error("ASSISTANT_INTEGRATION_FAILED");

    const integration = integrationCounts(JSON.parse(readFileSync(path.join(dir, "integration.json"), "utf8")));

    // Synthetic browser processes get neither DB/provider credentials nor cookies.
    const browserEnv: NodeJS.ProcessEnv = { NODE_ENV: "test", PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, CHROME_BIN: chromePath };

    const server = spawn(process.execPath, [browserSources.server, dir], { cwd: process.cwd(), env: browserEnv, stdio: ["ignore", "ignore", "ignore", "ipc"] });

    const stopServer = () => { server.kill("SIGTERM"); };

    process.once("SIGINT", stopServer);
    process.once("SIGTERM", stopServer);

    let browserProcessId: number | undefined;

    try {
      let ready = false;

      for (let attempt = 0; attempt < 300; attempt += 1) {
        if (server.exitCode !== null || server.signalCode !== null) throw new Error("ASSISTANT_BROWSER_SERVER_FAILED");

        try {
          const metadata = JSON.parse(readFileSync(path.join(dir, "process.json"), "utf8")) as { pid: number; chrome?: number; ready?: boolean };

          if (metadata.pid === server.pid) {
            browserProcessId = metadata.chrome;

            if (metadata.ready && browserProcessId) { ready = true; break; }
          }
        } catch { /* wait for owned server */ }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!ready) throw new Error("ASSISTANT_BROWSER_SERVER_TIMEOUT");

      const browser = spawnSync(process.execPath, [browserSources.check, dir], { cwd: process.cwd(), encoding: "utf8", env: browserEnv, maxBuffer: 2 * 1024 * 1024, timeout: 120_000 });

      writeFileSync(path.join(dir, "browser-run.log"), `${browser.stdout ?? ""}${browser.stderr ?? ""}`);

      if (browser.status !== 0) throw new Error("ASSISTANT_BROWSER_CHECK_FAILED");
    } finally {
      stopServer();
      await new Promise<void>(resolve => {
        if (server.exitCode !== null || server.signalCode !== null) return resolve();

        server.once("exit", () => resolve());
        setTimeout(() => { server.kill("SIGKILL"); resolve(); }, 8_000).unref();
      });

      process.removeListener("SIGINT", stopServer);
      process.removeListener("SIGTERM", stopServer);

      // A failure before Chrome spawn owns no Chrome process. Never kill by port/name.
      if (browserProcessId) {
        let chromeStopped = false;

        for (let attempt = 0; attempt < 50; attempt += 1) {
          try { process.kill(browserProcessId, 0); }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ESRCH") { chromeStopped = true; break; }

            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!chromeStopped) throw new Error("ASSISTANT_CHROME_PROCESS_NOT_STOPPED");
      }
    }

    const marker = `assistant-${runId}`;

    const leftovers = await Promise.all([
      db.user.count({ where: { id: { startsWith: marker } } }),
      db.campaign.count({ where: { name: { startsWith: marker } } }),
      db.assistantIntent.count({ where: { userId: { startsWith: marker } } }),
      db.assistantReceipt.count({ where: { userId: { startsWith: marker } } }),
      db.assistantRun.count({ where: { thread: { is: { userId: { startsWith: marker } } } } }),
    ]);

    if (leftovers.some(count => count !== 0)) throw new Error("ASSISTANT_FIXTURE_LEFTOVERS");

    const after = await listMigrations();

    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("ASSISTANT_MIGRATION_LIST_CHANGED");

    const browserEvidence = JSON.parse(readFileSync(path.join(dir, "browser.json"), "utf8")) as { evidence: unknown[]; total: number; passed: number; failed: number; skipped: number; apiBoundary: string };

    if (browserEvidence.total !== 18 || browserEvidence.passed !== browserEvidence.total || browserEvidence.failed !== 0 || browserEvidence.skipped !== 0 || browserEvidence.evidence.length !== browserEvidence.passed) throw new Error("ASSISTANT_BROWSER_REPORT_FAILED");

    process.stdout.write(`${JSON.stringify({ database: "constructor", local: true, bothUrls: true, connectionLimit: 1, runId, output: dir, appliedMigrationsBefore: before.length, appliedMigrationsAfter: after.length, migrationsUnchanged: true, integration, browser: { total: browserEvidence.total, passed: browserEvidence.passed, failed: browserEvidence.failed, skipped: browserEvidence.skipped }, browserCases: browserEvidence.evidence.length, browserViewports: [1440, 390], ownedFixtureLeftovers: leftovers, apiBoundary: browserEvidence.apiBoundary })}\n`);
  } finally {
    await db.$disconnect();
  }
}

void main().catch((error: unknown) => {
  const code = error instanceof Error && /^ASSISTANT_[A-Z_]+$/.test(error.message) ? error.message : "ASSISTANT_CHECK_FAILED";

  process.stderr.write(`${code} (inspect ignored run logs)\n`);
  process.exitCode = 1;
});
