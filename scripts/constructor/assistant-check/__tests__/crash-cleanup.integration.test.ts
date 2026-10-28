import { PrismaClient } from "@prisma/client";
import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { initManifest, MANIFEST_FILE, readManifest, setManifestPid, trackFixture } from "../manifest";
import { type RecoverDeps,recoverRun } from "../recover";

import { assertConstructorDatabaseUrls } from "@/lib/server/assistant/test-support";

assertConstructorDatabaseUrls({ DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL });

const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } }, log: [] });

const deps: RecoverDeps = { db, graceMs: 2_000 };

const spawned: ChildProcess[] = [];

const dirs: string[] = [];

const foreignUsers: string[] = [];

const exited = (child: ChildProcess) => new Promise<void>(resolve => {
  if (child.exitCode !== null || child.signalCode !== null) return resolve();

  child.once("exit", () => resolve());
});

const isAlive = (pid: number) => { try { process.kill(pid, 0);

 return true; } catch { return false; } };

const until = async (check: () => boolean, ms: number) => {
  for (let waited = 0; waited < ms; waited += 100) {
    if (check()) return true;

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return check();
};

async function deadPid() {
  const child = spawn("true", { stdio: "ignore" });

  await exited(child);

  return child.pid as number;
}

function runDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "crash-cleanup-"));

  dirs.push(dir);

  return dir;
}

const runId = `crash-${randomUUID().slice(0, 8)}`;


afterAll(async () => {
  for (const child of spawned) {
    if (child.pid && isAlive(child.pid)) child.kill("SIGKILL");
  }

  for (const id of foreignUsers) {
    await db.campaign.deleteMany({ where: { dmUserId: id } });
    await db.user.deleteMany({ where: { id } });
  }

  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });

  await db.$disconnect();
});

describe("assistant-check crash recovery (local constructor only)", () => {
  it("removes exactly the manifest fixtures after SIGKILL and keeps a foreign campaign with the same prefix", async () => {
    const dir = runDir();

    const manifestFile = path.join(dir, MANIFEST_FILE);

    initManifest(manifestFile, runId, await deadPid());

    const foreignId = `assistant-${runId}-foreign`;

    foreignUsers.push(foreignId);
    await db.user.create({ data: { id: foreignId, email: `${foreignId}@example.invalid`, displayName: foreignId } });

    const foreign = await db.campaign.create({ data: { name: foreignId, dmUserId: foreignId, inviteCode: randomUUID(), members: { create: { userId: foreignId, role: "dm" } } } });

    const worker = spawn(process.execPath, ["--import", "tsx", path.resolve(__dirname, "helpers/crash-worker.ts")], {
      cwd: process.cwd(), env: { ...process.env, TSX_TSCONFIG_PATH: "tsconfig.scripts.json", ASSISTANT_CHECK_MANIFEST: manifestFile, CRASH_WORKER_RUN_ID: runId }, stdio: ["ignore", "pipe", "inherit"],
    });

    spawned.push(worker);

    let out = "";

    worker.stdout?.on("data", chunk => { out += String(chunk); });

    expect(await until(() => out.includes("READY"), 25_000)).toBe(true);

    worker.kill("SIGKILL");
    await exited(worker);

    const manifest = readManifest(manifestFile);

    expect(manifest.fixtures.userIds).toHaveLength(1);
    expect(manifest.fixtures.campaignIds).toHaveLength(1);
    expect(await db.campaign.count({ where: { id: manifest.fixtures.campaignIds[0] } })).toBe(1);

    const result = await recoverRun(manifestFile, deps);

    expect(result.ok).toBe(true);
    expect(result.deleted).toEqual({ campaigns: manifest.fixtures.campaignIds, users: manifest.fixtures.userIds });
    expect(await db.campaign.count({ where: { id: { in: manifest.fixtures.campaignIds } } })).toBe(0);
    expect(await db.user.count({ where: { id: { in: manifest.fixtures.userIds } } })).toBe(0);
    expect(await db.campaign.count({ where: { id: foreign.id } })).toBe(1);
    expect(existsSync(manifestFile)).toBe(false);
  }, 60_000);

  it("tolerates ids recorded before the fixture was created", async () => {
    const dir = runDir();

    const manifestFile = path.join(dir, MANIFEST_FILE);

    initManifest(manifestFile, runId, await deadPid());
    trackFixture(manifestFile, "user", `assistant-${runId}-never-created`);
    trackFixture(manifestFile, "campaign", randomUUID());

    const result = await recoverRun(manifestFile, deps);

    expect(result).toMatchObject({ ok: true, deleted: { campaigns: [], users: [] } });
  });

  it("refuses to delete a manifest campaign that this run does not own", async () => {
    const dir = runDir();

    const manifestFile = path.join(dir, MANIFEST_FILE);

    initManifest(manifestFile, runId, await deadPid());

    const userId = `assistant-${runId}-unowned`;

    foreignUsers.push(userId);
    await db.user.create({ data: { id: userId, email: `${userId}@example.invalid`, displayName: userId } });

    const campaign = await db.campaign.create({ data: { name: "Чужа кампанія", dmUserId: userId, inviteCode: randomUUID(), members: { create: { userId, role: "dm" } } } });

    trackFixture(manifestFile, "user", userId);
    trackFixture(manifestFile, "campaign", campaign.id);

    const result = await recoverRun(manifestFile, deps);

    expect(result.ok).toBe(false);
    expect(await db.campaign.count({ where: { id: campaign.id } })).toBe(1);
    expect(await db.user.count({ where: { id: userId } })).toBe(1);
  });

  it("kills the orphaned chrome of a SIGKILLed browser-server by manifest pid", async () => {
    const dir = runDir();

    const manifestFile = path.join(dir, MANIFEST_FILE);

    initManifest(manifestFile, runId, await deadPid());

    const fakeChrome = path.join(dir, "fake-chrome.sh");

    writeFileSync(fakeChrome, "#!/bin/sh\nwhile :; do sleep 1; done\n");
    chmodSync(fakeChrome, 0o755);

    const server = spawn(process.execPath, [path.resolve(__dirname, "../browser-server.mjs"), dir, manifestFile], {
      cwd: process.cwd(), env: { NODE_ENV: "test", PATH: process.env.PATH, HOME: process.env.HOME, CHROME_BIN: fakeChrome }, stdio: "ignore",
    });

    spawned.push(server);

    expect(await until(() => readManifest(manifestFile).pids.chrome !== undefined, 60_000)).toBe(true);

    const { chrome } = readManifest(manifestFile).pids;

    expect(chrome).toBeDefined();
    server.kill("SIGKILL");
    await exited(server);
    expect(isAlive(chrome as number)).toBe(true);

    const result = await recoverRun(manifestFile, deps);

    expect(result.ok).toBe(true);
    expect(result.killed.map(item => item.key)).toContain("chrome");
    expect(isAlive(chrome as number)).toBe(false);
  }, 90_000);

  it("never kills a foreign process and deletes nothing when a pid is not ours", async () => {
    const dir = runDir();

    const manifestFile = path.join(dir, MANIFEST_FILE);

    initManifest(manifestFile, runId, await deadPid());

    const stranger = spawn("sleep", ["60"], { stdio: "ignore" });

    spawned.push(stranger);

    const userId = `assistant-${runId}-bystander`;

    foreignUsers.push(userId);
    await db.user.create({ data: { id: userId, email: `${userId}@example.invalid`, displayName: userId } });
    trackFixture(manifestFile, "user", userId);
    setManifestPid(manifestFile, "chrome", stranger.pid as number);

    const result = await recoverRun(manifestFile, deps);

    expect(result.ok).toBe(false);
    expect(result.skipped).toEqual([{ key: "chrome", pid: stranger.pid, reason: "foreign-process" }]);
    expect(isAlive(stranger.pid as number)).toBe(true);
    expect(await db.user.count({ where: { id: userId } })).toBe(1);
    expect(existsSync(manifestFile)).toBe(true);
    expect(readFileSync(manifestFile, "utf8")).toContain(String(stranger.pid));
  });

  it("refuses a non-constructor database before any query", async () => {
    const dir = runDir();

    const manifestFile = path.join(dir, MANIFEST_FILE);

    initManifest(manifestFile, runId, await deadPid());

    const trap = new Proxy({}, { get: () => { throw new Error("DB_TOUCHED"); } }) as RecoverDeps["db"];

    await expect(recoverRun(manifestFile, { db: trap, env: { ...process.env, DATABASE_URL: "postgresql://u:p@db.example.supabase.co:5432/postgres" } })).rejects.toThrow("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");
    await expect(recoverRun(manifestFile, { db: trap, env: { ...process.env, DIRECT_URL: "postgresql://u:p@localhost:5432/prod" } })).rejects.toThrow("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");
  });
});
