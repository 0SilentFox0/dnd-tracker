import { closeSync, existsSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

export const MANIFEST_FILE = "manifest.json";
export const MANIFEST_ENV = "ASSISTANT_CHECK_MANIFEST";

export const MANIFEST_PID_KEYS = ["parent", "vitest", "server", "chrome"] as const;

export type ManifestPidKey = (typeof MANIFEST_PID_KEYS)[number];
export type FixtureKind = "user" | "campaign";
export type OnCreated = (kind: FixtureKind, id: string) => void;

export interface RunManifest {
  runId: string;
  pids: { parent: number } & Partial<Record<Exclude<ManifestPidKey, "parent">, number>>;
  fixtures: { userIds: string[]; campaignIds: string[] };
  startedAt: string;
}

const ID_PATTERN = /^[A-Za-z0-9._-]{1,200}$/;

const invalid = () => new Error("ASSISTANT_MANIFEST_INVALID");

const isIdList = (value: unknown): value is string[] => Array.isArray(value) && value.every(id => typeof id === "string" && ID_PATTERN.test(id));

const isPid = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 1;

export function parseManifest(raw: unknown): RunManifest {
  const value = raw as Partial<RunManifest> | null;

  if (!value || typeof value !== "object" || typeof value.runId !== "string" || !ID_PATTERN.test(value.runId) || typeof value.startedAt !== "string") throw invalid();

  const { pids, fixtures } = value;

  if (!pids || typeof pids !== "object" || !isPid(pids.parent)) throw invalid();

  for (const key of MANIFEST_PID_KEYS) if (pids[key] !== undefined && !isPid(pids[key])) throw invalid();

  if (!fixtures || !isIdList(fixtures.userIds) || !isIdList(fixtures.campaignIds)) throw invalid();

  return { runId: value.runId, pids, fixtures: { userIds: [...fixtures.userIds], campaignIds: [...fixtures.campaignIds] }, startedAt: value.startedAt };
}

export function readManifest(file: string): RunManifest {
  try { return parseManifest(JSON.parse(readFileSync(file, "utf8"))); }
  catch { throw invalid(); }
}

function atomicWrite(file: string, data: RunManifest) {
  const tmp = `${file}.${process.pid}.tmp`;

  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, file);
}

const sleepSync = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Cross-process read-modify-write; a lock older than 5 s belongs to a crashed writer. */
export function updateManifest(file: string, mutate: (data: RunManifest) => void) {
  const lock = `${file}.lock`;

  for (let attempt = 0; ; attempt += 1) {
    try { closeSync(openSync(lock, "wx")); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;

      try { if (Date.now() - statSync(lock).mtimeMs > 5_000) unlinkSync(lock); } catch { /* released meanwhile */ }

      if (attempt > 500) throw new Error("ASSISTANT_MANIFEST_LOCKED");

      sleepSync(10);
    }
  }

  try {
    const data = readManifest(file);

    mutate(data);
    atomicWrite(file, data);
  } finally {
    try { unlinkSync(lock); } catch { /* already gone */ }
  }
}

export function initManifest(file: string, runId: string, parent = process.pid): RunManifest {
  const data: RunManifest = { runId, pids: { parent }, fixtures: { userIds: [], campaignIds: [] }, startedAt: new Date().toISOString() };

  atomicWrite(file, data);

  return data;
}

export function setManifestPid(file: string, key: Exclude<ManifestPidKey, "parent">, pid: number) {
  updateManifest(file, data => { data.pids[key] = pid; });
}

export function trackFixture(file: string, kind: FixtureKind, id: string) {
  if (!ID_PATTERN.test(id)) throw invalid();

  updateManifest(file, data => {
    const list = kind === "user" ? data.fixtures.userIds : data.fixtures.campaignIds;

    if (!list.includes(id)) list.push(id);
  });
}

export function manifestTracker(env: NodeJS.ProcessEnv = process.env): OnCreated | undefined {
  const file = env[MANIFEST_ENV];

  return file ? (kind, id) => trackFixture(file, kind, id) : undefined;
}

/** Run directories are `<runId>-<random>`; only directories holding an unrecovered manifest count. */
export function findRunManifests(outputRoot: string, runId: string): string[] {
  if (!existsSync(outputRoot)) return [];

  return readdirSync(outputRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith(`${runId}-`))
    .map(entry => path.join(outputRoot, entry.name, MANIFEST_FILE))
    .filter(file => existsSync(file));
}

export function retireManifest(file: string, suffix: "completed" | "recovered") {
  renameSync(file, file.replace(/\.json$/, `.${suffix}.json`));
}
