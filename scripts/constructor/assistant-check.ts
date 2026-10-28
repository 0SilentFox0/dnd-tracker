import { PrismaClient } from "@prisma/client";
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { findRunManifests, initManifest, MANIFEST_ENV, MANIFEST_FILE, retireManifest, setManifestPid } from "./assistant-check/manifest";
import { assistantCheckPreflight, browserSources } from "./assistant-check/preflight";
import { recoverRun } from "./assistant-check/recover";
import { integrationCounts } from "./assistant-check/results";

import { constructorDatabaseTarget } from "@/lib/server/assistant/test-support";

const children = new Set<ChildProcess>();

function runChild(command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; timeout: number; maxBuffer: number; onSpawn?: (pid: number) => void }) {
  return new Promise<{ status: number | null; output: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: ["ignore", "pipe", "pipe"] });

    let output = "";

    const collect = (chunk: Buffer) => { if (output.length < options.maxBuffer) output += chunk.toString("utf8"); };

    children.add(child);
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    const timer = setTimeout(() => { child.kill("SIGTERM"); }, options.timeout);

    child.once("error", error => { clearTimeout(timer); children.delete(child); reject(error); });
    child.once("close", status => { clearTimeout(timer); children.delete(child); resolve({ status, output }); });

    if (child.pid) options.onSpawn?.(child.pid);
  });
}

function outputRootOf(args: string[]) {
  if (args.length && (args.length !== 2 || args[0] !== "--output-dir")) throw new Error("ASSISTANT_INVALID_OPTIONS");

  return path.resolve(args[1] ?? ".superpowers/assistant-check");
}

async function recoverCli(runId: string, rest: string[]) {
  constructorDatabaseTarget({ DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL });

  if (!/^[a-zA-Z0-9-]{12,80}$/.test(runId)) throw new Error("ASSISTANT_INVALID_OPTIONS");

  const manifests = findRunManifests(outputRootOf(rest), runId);

  if (manifests.length !== 1) throw new Error("ASSISTANT_RECOVER_MANIFEST_NOT_UNIQUE");

  const url = new URL(process.env.DATABASE_URL ?? "");

  url.searchParams.set("connection_limit", "1");

  const db = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });

  try {
    const result = await recoverRun(manifests[0], { db });

    process.stdout.write(`${JSON.stringify(result)}\n`);

    if (!result.ok) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const mode = process.argv[2];

  if (mode === "--recover") {
    if (!process.argv[3]) throw new Error("ASSISTANT_INVALID_OPTIONS");

    return recoverCli(process.argv[3], process.argv.slice(4));
  }

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
    process.stderr.write("Expected --check-target, --run or --recover <runId>\n");
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

  if (findRunManifests(outputRoot, runId).length) {
    process.stderr.write("ASSISTANT_RUN_REQUIRES_RECOVER (run again with --recover <runId>)\n");
    process.exitCode = 1;

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

    const manifestFile = path.join(dir, MANIFEST_FILE);

    initManifest(manifestFile, runId);
    process.stderr.write(`ASSISTANT_CHECK_OUTPUT=${dir}\n`);

    const onSignal = (signal: NodeJS.Signals) => {
      for (const child of children) child.kill("SIGTERM");

      void (async () => {
        await new Promise(resolve => setTimeout(resolve, 3_000));

        for (const child of children) child.kill("SIGKILL");

        await new Promise(resolve => setTimeout(resolve, 500));

        try { await recoverRun(manifestFile, { db }); } catch { /* manifest stays for --recover */ }

        process.exit(signal === "SIGINT" ? 130 : 143);
      })();
    };

    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);

    const test = await runChild("pnpm", ["exec", "vitest", "run", "--config", "vitest.integration.config.mts", "--reporter=default", "--reporter=json", `--outputFile=${path.join(dir, "integration.json")}`, "lib/server/assistant/__tests__/execution.integration.test.ts"], {
      cwd: process.cwd(), env: { ...process.env, ASSISTANT_CHECK_RUN_ID: runId, [MANIFEST_ENV]: manifestFile }, maxBuffer: 10 * 1024 * 1024, timeout: 180_000, onSpawn: pid => setManifestPid(manifestFile, "vitest", pid),
    });

    writeFileSync(path.join(dir, "integration.log"), test.output);

    if (test.status !== 0) throw new Error("ASSISTANT_INTEGRATION_FAILED");

    const integration = integrationCounts(JSON.parse(readFileSync(path.join(dir, "integration.json"), "utf8")));

    // Synthetic browser processes get neither DB/provider credentials nor cookies.
    const browserEnv: NodeJS.ProcessEnv = { NODE_ENV: "test", PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, CHROME_BIN: chromePath };

    const server = spawn(process.execPath, [browserSources.server, dir, manifestFile], { cwd: process.cwd(), env: browserEnv, stdio: ["ignore", "ignore", "ignore", "ipc"] });

    children.add(server);

    if (server.pid) setManifestPid(manifestFile, "server", server.pid);

    const stopServer = () => { server.kill("SIGTERM"); };

    let browserProcessId: number | undefined;

    try {
      let ready = false;

      for (let attempt = 0; attempt < 300; attempt += 1) {
        if (server.exitCode !== null || server.signalCode !== null) throw new Error("ASSISTANT_BROWSER_SERVER_FAILED");

        try {
          const metadata = JSON.parse(readFileSync(path.join(dir, "process.json"), "utf8")) as { pid: number; chrome?: number; ready?: boolean };

          if (metadata.pid === server.pid) {
            browserProcessId = metadata.chrome;

            if (browserProcessId) setManifestPid(manifestFile, "chrome", browserProcessId);

            if (metadata.ready && browserProcessId) { ready = true; break; }
          }
        } catch { /* wait for owned server */ }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!ready) throw new Error("ASSISTANT_BROWSER_SERVER_TIMEOUT");

      const browser = await runChild(process.execPath, [browserSources.check, dir], { cwd: process.cwd(), env: browserEnv, maxBuffer: 2 * 1024 * 1024, timeout: 120_000 });

      writeFileSync(path.join(dir, "browser-run.log"), browser.output);

      if (browser.status !== 0) throw new Error("ASSISTANT_BROWSER_CHECK_FAILED");
    } finally {
      stopServer();
      await new Promise<void>(resolve => {
        if (server.exitCode !== null || server.signalCode !== null) return resolve();

        server.once("exit", () => resolve());
        setTimeout(() => { server.kill("SIGKILL"); resolve(); }, 8_000).unref();
      });

      children.delete(server);

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

    retireManifest(manifestFile, "completed");

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
