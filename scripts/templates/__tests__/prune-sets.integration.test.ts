import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { contentLayer } from "@/lib/db/content-layer";
import { createScopedDatabase } from "@/lib/server/content/write-context";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } } });

const scoped = createScopedDatabase(raw.$extends(contentLayer()));

vi.mock("@/lib/db", () => ({ get prisma() { return scoped; } }));
vi.mock("@/lib/cache/tags", async (orig) => ({ ...(await orig<object>()), invalidateReference: vi.fn(), invalidateAllReference: vi.fn() }));

import { importPack } from "../lib/import-pack";

const marker = `prunesets-${randomUUID()}`;

const fixtures = path.join(__dirname, "fixtures");

describe.skipIf(!isLocalDevDatabaseEnv())("template prune of artifact sets, and the slug guard for match-column kinds (fixture pack)", () => {
  let guardPassed = false;

  let templateId = "";

  let dir = "";

  const packFile = (name: string) => path.join(dir, "fixture-sets", name);

  const writeJson = (name: string, value: unknown) => fs.writeFileSync(packFile(name), JSON.stringify(value));

  const readJson = <T>(name: string) => JSON.parse(fs.readFileSync(packFile(name), "utf8")) as T;

  const setCounts = (counts: Record<string, number>) => writeJson("manifest.json", { ...readJson<{ counts: object }>("manifest.json"), counts: { ...readJson<{ counts: object }>("manifest.json").counts, ...counts } });

  beforeAll(async () => {
    if (await raw.campaign.count({ where: { kind: "template", templateKey: "fixture-sets" } })) throw new Error("a fixture-sets template already exists in the test database");

    guardPassed = true;
    await raw.user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    dir = fs.mkdtempSync(path.join(os.tmpdir(), "prune-sets-"));
    fs.cpSync(path.join(fixtures, "fixture-sets"), path.join(dir, "fixture-sets"), { recursive: true });
    templateId = (await importPack("fixture-sets", { owner: marker, dir })).templateId as string;
  });

  afterAll(async () => {
    if (!guardPassed) return void (await raw.$disconnect());

    const ids = (await raw.campaign.findMany({ where: { dmUserId: marker }, select: { id: true } })).map((c) => c.id);

    await raw.campaign.updateMany({ where: { id: { in: ids } }, data: { baseSourceId: null, createdFromId: null } });

    for (const base of ["artifactBase", "artifactSetBase", "campaignTrackBase"] as const) await (raw[base] as unknown as { deleteMany(args: unknown): Promise<unknown> }).deleteMany({ where: { sourceCampaignId: { in: ids } } });

    await raw.campaign.deleteMany({ where: { id: { in: ids } } });
    await raw.user.deleteMany({ where: { id: marker } });
    fs.rmSync(dir, { recursive: true, force: true });
    await raw.$disconnect();
  });

  it("pruning a set detaches the artifacts that still point at it", async () => {
    const dropSet = await raw.artifactSet.findFirstOrThrow({ where: { campaignId: templateId, slug: "set-drop" } });

    const keepSet = await raw.artifactSet.findFirstOrThrow({ where: { campaignId: templateId, slug: "set-keep" } });

    const stray = await raw.artifact.create({ data: { campaignId: templateId, name: "Stray", slot: "ring", rarity: "rare", setId: dropSet.id } });

    writeJson("artifact-sets.json", readJson<{ slug: string }[]>("artifact-sets.json").filter((row) => row.slug !== "set-drop"));
    writeJson("artifacts.json", readJson<{ slug: string }[]>("artifacts.json").map((row) => (row.slug === "art-a" ? { ...row, setId: "Keep Set" } : row)));
    setCounts({ "artifact-sets": 1 });

    const dry = await importPack("fixture-sets", { dir, dryRun: true, prune: true });

    expect(dry.perKind["artifact-sets"].deleted).toBe(1);
    expect(await raw.artifactSet.count({ where: { id: dropSet.id } })).toBe(1);

    const pruned = await importPack("fixture-sets", { dir, prune: true });

    expect(pruned.perKind["artifact-sets"].deleted).toBe(1);
    expect(await raw.artifactSet.count({ where: { id: dropSet.id } })).toBe(0);
    expect((await raw.artifact.findUniqueOrThrow({ where: { id: stray.id } })).setId).toBeNull();
    expect((await raw.artifact.findFirstOrThrow({ where: { campaignId: templateId, slug: "art-a" } })).setId).toBe(keepSet.id);
  });

  it("refuses to create a track while an unslugged track exists, and prune keeps the unslugged one", async () => {
    const legacy = await raw.campaignTrack.create({ data: { campaignId: templateId, title: "Old Theme", kind: "youtube", youtubeId: "zzzzzzzzzzz" } });

    const tracks = readJson<object[]>("tracks.json");

    writeJson("tracks.json", [...tracks, { slug: "track-two", title: "New Theme", kind: "youtube", youtubeId: "yyyyyyyyyyy", durationSec: 30, sortOrder: 2 }]);
    setCounts({ tracks: 2 });

    await expect(importPack("fixture-sets", { dir })).rejects.toThrow(/Refusing to create 1 tracks row\(s\) while 1 row\(s\) of the template have no slug/);
    expect(await raw.campaignTrack.count({ where: { campaignId: templateId } })).toBe(2);

    writeJson("tracks.json", tracks);
    setCounts({ tracks: 1 });

    const kept = await importPack("fixture-sets", { dir, prune: true });

    expect(kept.outside).toEqual([]);
    expect(await raw.campaignTrack.count({ where: { id: legacy.id } })).toBe(1);
  });
});
