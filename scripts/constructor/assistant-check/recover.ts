import type { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { MANIFEST_PID_KEYS, type ManifestPidKey, readManifest, retireManifest } from "./manifest";

import { assertConstructorDatabaseUrls } from "@/lib/server/assistant/test-support";

export interface RecoverDeps {
  db: Pick<PrismaClient, "user" | "campaign" | "assistantReceipt" | "assistantIntent">;
  kill?: (pid: number, signal: NodeJS.Signals) => void;
  commandOf?: (pid: number) => string | null;
  env?: NodeJS.ProcessEnv;
  graceMs?: number;
}

export interface RecoverResult {
  ok: boolean;
  killed: Array<{ key: ManifestPidKey; pid: number }>;
  skipped: Array<{ key: ManifestPidKey; pid: number; reason: "foreign-process" | "run-active" | "not-stopped" }>;
  deleted: { campaigns: string[]; users: string[] };
  problems: string[];
}

export function psCommand(pid: number): string | null {
  try {
    const command = execFileSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

    return command || null;
  } catch { return null; }
}

const OWNED_EMAIL_DOMAIN = "@example.invalid";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fail-closed: every pid and every fixture is verified first; any doubt means nothing is killed or deleted.
 * A pid is ours only while its command line still mentions this run's output directory.
 */
export async function recoverRun(manifestPath: string, deps: RecoverDeps): Promise<RecoverResult> {
  const env = deps.env ?? process.env;

  assertConstructorDatabaseUrls({ DATABASE_URL: env.DATABASE_URL, DIRECT_URL: env.DIRECT_URL });

  const { db } = deps;

  const kill = deps.kill ?? ((pid, signal) => { process.kill(pid, signal); });

  const commandOf = deps.commandOf ?? psCommand;

  const manifest = readManifest(manifestPath);

  const marker = path.dirname(path.resolve(manifestPath));

  const result: RecoverResult = { ok: true, killed: [], skipped: [], deleted: { campaigns: [], users: [] }, problems: [] };

  const alive: Array<{ key: ManifestPidKey; pid: number }> = [];

  for (const key of MANIFEST_PID_KEYS) {
    const pid = manifest.pids[key];

    if (!pid) continue;

    const command = commandOf(pid);

    if (command === null) continue;

    if (key === "parent") result.skipped.push({ key, pid, reason: "run-active" });
    else if (!command.includes(marker)) result.skipped.push({ key, pid, reason: "foreign-process" });
    else alive.push({ key, pid });
  }

  const prefixes = [manifest.runId, `assistant-${manifest.runId}`];

  const owned = (value: string | null | undefined) => !!value && prefixes.some(prefix => value.startsWith(prefix));

  const userIds = new Set(manifest.fixtures.userIds);

  const campaignIds = new Set(manifest.fixtures.campaignIds);

  const campaignPlan: string[] = [];

  const userPlan: string[] = [];

  for (const id of campaignIds) {
    const row = await db.campaign.findUnique({ where: { id }, select: { name: true, dmUserId: true, members: { select: { userId: true, role: true } } } });

    if (!row) continue;

    if (!owned(row.name) || !userIds.has(row.dmUserId) || row.members.length !== 1 || row.members[0].userId !== row.dmUserId || row.members[0].role !== "dm") result.problems.push(`campaign ${id}: ownership mismatch`);
    else campaignPlan.push(id);
  }

  for (const id of userIds) {
    const row = await db.user.findUnique({ where: { id }, select: { displayName: true, email: true, dmCampaigns: { select: { id: true } }, campaignMembers: { select: { campaignId: true } } } });

    if (!row) continue;

    const foreign = row.dmCampaigns.some(campaign => !campaignIds.has(campaign.id)) || row.campaignMembers.some(member => !campaignIds.has(member.campaignId));

    if (!owned(id) || !owned(row.displayName) || row.email !== `${row.displayName}${OWNED_EMAIL_DOMAIN}` || foreign) result.problems.push(`user ${id}: ownership mismatch`);
    else userPlan.push(id);
  }

  if (result.skipped.length || result.problems.length) return { ...result, ok: false };

  const grace = deps.graceMs ?? 3_000;

  const waitDead = async (pid: number, timeout: number) => {
    for (let waited = 0; waited < timeout; waited += 100) {
      if (commandOf(pid) === null) return true;

      await sleep(100);
    }

    return commandOf(pid) === null;
  };

  for (const { key, pid } of alive) {
    try { kill(pid, "SIGTERM"); } catch { /* exited meanwhile */ }

    if (!await waitDead(pid, grace)) {
      try { kill(pid, "SIGKILL"); } catch { /* exited meanwhile */ }
    }

    if (await waitDead(pid, grace)) result.killed.push({ key, pid });
    else result.skipped.push({ key, pid, reason: "not-stopped" });
  }

  if (result.skipped.length) return { ...result, ok: false };

  for (const id of campaignPlan) {
    await db.assistantIntent.deleteMany({ where: { campaignId: id, userId: { in: [...userIds] } } });
    await db.assistantReceipt.deleteMany({ where: { campaignId: id, userId: { in: [...userIds] } } });
    await db.campaign.delete({ where: { id } });
    result.deleted.campaigns.push(id);
  }

  for (const id of userPlan) {
    await db.assistantIntent.deleteMany({ where: { userId: id } });
    await db.assistantReceipt.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } });
    result.deleted.users.push(id);
  }

  retireManifest(manifestPath, "recovered");

  return result;
}
