import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  access: vi.fn(),
  character: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  $queryRaw: vi.fn(async () => []),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { ...h, $transaction: (fn: (db: typeof h) => unknown) => fn(h) } }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: h.access, requireDM: h.access, requireAuth: vi.fn() }));
vi.mock("@/lib/server/notifications/notify", () => ({ notifyCharacterOwners: vi.fn() }));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async () => ({ ok: true, avatar: undefined })) }));

import { getOperation } from "../get";
import { listOperation, redactListedLedgers } from "../list";
import { patchOperation } from "../patch";

import { WFRP_SYSTEM } from "@/systems/wfrp";
import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

const entry = { id: "e1", at: "2026-01-01T00:00:00.000Z", kind: "characteristic", key: "ws", from: 0, to: 1, cost: 25 } as const;

const stored = { ...DEFAULT_CHARACTERISTICS, advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 1 }, talents: { feat: 1 }, ledger: [entry] };

const rows = [
  { id: "mine", controlledBy: "p1", characteristics: stored },
  { id: "theirs", controlledBy: "p2", characteristics: stored },
  { id: "dnd", controlledBy: "p2", characteristics: null },
];

type ListRow = { id: string; characteristics: typeof stored | null };

const listFor = async (viewer: { userId: string; isDM: boolean }) => {
  h.access.mockResolvedValue({ ...viewer, campaign: { id: "camp", rules: WFRP_RULES } });
  h.character.findMany.mockResolvedValue(rows.map((r) => ({ ...r })));

  const gate = await listOperation.gate({ campaignId: "camp", characterId: "" });

  return (await listOperation.run(gate as never, { compact: false })) as ListRow[];
};

beforeEach(() => vi.clearAllMocks());

describe("ledger redaction on list", () => {
  it("another player sees an empty ledger for others, own ledger intact, null untouched", async () => {
    const result = await listFor({ userId: "p1", isDM: false });

    expect(result.find((r) => r.id === "mine")?.characteristics?.ledger).toEqual([entry]);
    expect(result.find((r) => r.id === "theirs")?.characteristics?.ledger).toEqual([]);
    expect(result.find((r) => r.id === "theirs")?.characteristics?.talents).toEqual({ feat: 1 });
    expect(result.find((r) => r.id === "dnd")?.characteristics).toBeNull();
  });

  it("DM sees every ledger", async () => {
    const result = await listFor({ userId: "dm", isDM: true });

    expect(result.filter((r) => r.characteristics).every((r) => r.characteristics?.ledger.length === 1)).toBe(true);
  });
});

describe("redaction leaves rows without wfrp keys alone", () => {
  it("a d20 hero with {} stays {} for another player; a wfrp hero is redacted", () => {
    const [d20, wfrp] = redactListedLedgers(
      [
        { controlledBy: "p2", characteristics: {} },
        { controlledBy: "p2", characteristics: { ...stored, downtime: { ailments: [] } } },
      ],
      { userId: "p1", isDM: false },
      WFRP_SYSTEM,
    );

    expect(d20.characteristics).toEqual({});
    expect("downtime" in (wfrp.characteristics as object)).toBe(false);
    expect((wfrp.characteristics as typeof stored).ledger).toEqual([]);
  });
});

describe("downtime redaction on list", () => {
  const withDowntime = { ...stored, downtime: { ailments: [] } };

  it("redactListedLedgers strips downtime even without a ledger in the row", () => {
    const [row] = redactListedLedgers([{ controlledBy: "p2", characteristics: { downtime: { ailments: [] } } }], { userId: "p1", isDM: false }, WFRP_SYSTEM);

    expect("downtime" in (row.characteristics as object)).toBe(false);
  });

  it("another player does not see downtime, owner and DM do", async () => {
    const run = async (viewer: { userId: string; isDM: boolean }) => {
      h.access.mockResolvedValue({ ...viewer, campaign: { id: "camp", rules: WFRP_RULES } });
      h.character.findMany.mockResolvedValue([{ id: "theirs", controlledBy: "p2", characteristics: withDowntime }]);

      const gate = await listOperation.gate({ campaignId: "camp", characterId: "" });

      return ((await listOperation.run(gate as never, { compact: false })) as { characteristics: object }[])[0].characteristics;
    };

    expect("downtime" in (await run({ userId: "p1", isDM: false }))).toBe(false);
    expect("downtime" in (await run({ userId: "p2", isDM: false }))).toBe(true);
    expect("downtime" in (await run({ userId: "dm", isDM: true }))).toBe(true);
  });
});

describe("get stays owner/DM only", () => {
  it("a stranger gets 403 before any data is returned", async () => {
    h.character.findUnique.mockResolvedValue({ id: "theirs", campaignId: "camp", controlledBy: "p2", characteristics: stored, campaign: { members: [{ userId: "p1", role: "player" }] } });

    await expect(getOperation.run({ userId: "p1", campaignId: "camp" }, { characterId: "theirs" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("PATCH cannot bypass the ledger", () => {
  const record = { id: "mine", campaignId: "camp", controlledBy: "p1", type: "player", status: "active", level: 1, classes: [], race: "", avatar: null, characteristics: stored };

  const patch = async (viewer: { userId: string; isDM: boolean }, characteristics: object, fresh: object = record, careerBaseline?: object) => {
    h.access.mockResolvedValue({ ...viewer, campaign: { id: "camp", maxLevel: 20, allowPlayerEdit: true, rules: WFRP_RULES } });
    h.character.findUnique.mockResolvedValueOnce(record).mockResolvedValue(fresh);
    h.character.update.mockResolvedValue({ ...record, level: 1 });

    const gate = await patchOperation.gate({ campaignId: "camp", characterId: "mine" });

    expect(gate).not.toBeInstanceOf(NextResponse);

    await patchOperation.run(gate as never, patchOperation.schema.parse({ characteristics, ...(careerBaseline && { systemBaseline: { ...stored, career: careerBaseline } }) }));

    return h.character.update.mock.calls[0][0].data.characteristics as typeof stored;
  };

  const tampered = { ...stored, fate: 2, advances: { ...stored.advances, ws: 30 }, talents: { cheat: 3 }, ledger: [], skillAdvances: { "melee:basic": 20 } };

  it("player: advances, talents, ledger, skillAdvances stay server-side, fate is saved", async () => {
    const saved = await patch({ userId: "p1", isDM: false }, tampered);

    expect(saved).toMatchObject({ fate: 2, advances: stored.advances, talents: stored.talents, ledger: stored.ledger, skillAdvances: {} });
  });

  it("DM edits advances directly", async () => {
    const saved = await patch({ userId: "dm", isDM: true }, { ...tampered, ledger: stored.ledger });

    expect(saved).toMatchObject({ fate: 2, advances: tampered.advances, talents: { cheat: 3 }, ledger: stored.ledger });
  });

  const bought = { ...stored, advances: { ...stored.advances, ws: 2 }, ledger: [...stored.ledger, { ...entry, id: "e2", from: 1, to: 2 }] };

  it("player: a purchase committed after the gate read is not reverted", async () => {
    const saved = await patch({ userId: "p1", isDM: false }, { ...stored, fate: 2 }, { ...record, characteristics: bought });

    expect(saved).toMatchObject({ fate: 2, advances: bought.advances, ledger: bought.ledger });
  });

  it("DM: saving a sheet loaded before a purchase returns 409 and writes nothing", async () => {
    await expect(patch({ userId: "dm", isDM: true }, { ...stored, fate: 2 }, { ...record, characteristics: bought })).rejects.toMatchObject({ status: 409 });
    expect(h.character.update).not.toHaveBeenCalled();
  });

  const career = { careerId: "c1", tier: 1 as const, ticks: [] as string[] };

  const advanced = { ...record, characteristics: { ...stored, career: { ...career, tier: 2 as const } } };

  it("DM: a career advanced after the editor loaded returns 409 and writes nothing", async () => {
    await expect(patch({ userId: "dm", isDM: true }, { ...stored, career }, advanced, career)).rejects.toMatchObject({ status: 409 });
    expect(h.character.update).not.toHaveBeenCalled();
  });

  it("DM: a matching career baseline saves, and a deliberate career change passes", async () => {
    const withCareer = { ...record, characteristics: { ...stored, career } };

    const saved = await patch({ userId: "dm", isDM: true }, { ...stored, career: { ...career, tier: 3 as const } }, withCareer, career);

    expect(saved.career).toMatchObject({ tier: 3 });
  });

  const downtime = { ailments: [], lastPeriod: { id: "p1", at: "2026-01-01T00:00:00.000Z", days: 7, before: { ailments: [] }, after: { ailmentIds: [] }, summary: { healed: 0, ailments: [] } } };

  const withDowntime = { ...record, characteristics: { ...stored, downtime } };

  it("DM: the stored downtime wins over the one in the form", async () => {
    const saved = await patch({ userId: "dm", isDM: true }, { ...stored, downtime: { ailments: [] } }, withDowntime);

    expect(saved.downtime).toEqual(downtime);
  });

  it("player: downtime stays server-side", async () => {
    const saved = await patch({ userId: "p1", isDM: false }, { ...stored, downtime: { ailments: [], training: { kind: "skill", key: "charm", discount: 50 } } }, withDowntime);

    expect(saved.downtime).toEqual(downtime);
  });

  it("player: career stays server-side, baseline ignored", async () => {
    const saved = await patch({ userId: "p1", isDM: false }, { ...stored, career: { ...career, tier: 4 as const } }, advanced, career);

    expect(saved.career).toMatchObject({ tier: 2 });
  });

  const corruption = { points: 7, mutations: [{ id: "m1", at: "2026-01-01T00:00:00.000Z", kind: "physical" as const, roll: 5, text: "Scales", effects: [] }] };

  const withCorruption = { ...record, characteristics: { ...stored, corruption } };

  it.each([
    ["DM", { userId: "dm", isDM: true }],
    ["player", { userId: "p1", isDM: false }],
  ])("%s: the stored corruption wins over the one in the form", async (_n, viewer) => {
    const saved = await patch(viewer, { ...stored, corruption: { points: 0, mutations: [] } }, withCorruption);

    expect(saved.corruption).toEqual(corruption);
  });

  it("another player does not see corruption, owner and DM do", async () => {
    const run = async (viewer: { userId: string; isDM: boolean }) => {
      h.access.mockResolvedValue({ ...viewer, campaign: { id: "camp", rules: WFRP_RULES } });
      h.character.findMany.mockResolvedValue([{ id: "theirs", controlledBy: "p2", characteristics: { ...stored, corruption } }]);

      const gate = await listOperation.gate({ campaignId: "camp", characterId: "" });

      return ((await listOperation.run(gate as never, { compact: false })) as { characteristics: object }[])[0].characteristics;
    };

    expect("corruption" in (await run({ userId: "p1", isDM: false }))).toBe(false);
    expect("corruption" in (await run({ userId: "p2", isDM: false }))).toBe(true);
    expect("corruption" in (await run({ userId: "dm", isDM: true }))).toBe(true);
  });
});
