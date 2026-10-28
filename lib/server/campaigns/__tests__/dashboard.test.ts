import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  character: { count: vi.fn(), findFirst: vi.fn() },
  scenarioPage: { findMany: vi.fn() },
  battleScene: { findMany: vi.fn() },
  battleParticipant: { findFirst: vi.fn() },
  worldMap: { count: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { readDmDashboard, readPlayerDashboard } from "@/lib/server/campaigns/dashboard";

const FORBIDDEN = ["participants", "map", "snapshot", "skills", "abilities"];

function selectsOf(): object[] {
  return Object.values(db).flatMap((m) => Object.values(m).flatMap((fn) => fn.mock.calls.map((c) => c[0]?.select).filter(Boolean)));
}

beforeEach(() => {
  vi.clearAllMocks();
  db.character.count.mockResolvedValue(2);
  db.scenarioPage.findMany.mockResolvedValue([{ id: "p1", title: "Акт 1" }]);
  db.battleScene.findMany.mockResolvedValue([]);
});

describe("readDmDashboard", () => {
  it("повертає кількість, сторінки та бої з вузьким select", async () => {
    db.battleScene.findMany.mockResolvedValue([{ id: "b1", name: "Бій", status: "prepared" }]);

    const res = await readDmDashboard("c1");

    expect(res).toEqual({ pendingDrafts: 2, scenarioPages: [{ id: "p1", title: "Акт 1" }], battles: [{ id: "b1", name: "Бій", status: "prepared" }] });

    const arg = db.battleScene.findMany.mock.calls[0][0];

    expect(arg.where.status.in).toEqual(["prepared", "active"]);
    expect(arg.select).toEqual({ id: true, name: true, status: true });
  });

  it("активний бій першим і не більше трьох", async () => {
    db.battleScene.findMany.mockResolvedValue([
      { id: "p1", name: "a", status: "prepared" },
      { id: "p2", name: "b", status: "prepared" },
      { id: "p3", name: "c", status: "prepared" },
      { id: "a1", name: "d", status: "active" },
    ]);

    const res = await readDmDashboard("c1");

    expect(res.battles.map((b) => b.id)).toEqual(["a1", "p1", "p2"]);
  });

  it("select без важких полів", async () => {
    await readDmDashboard("c1");

    selectsOf().forEach((s) => FORBIDDEN.forEach((k) => expect(s).not.toHaveProperty(k)));
  });
});

describe("readPlayerDashboard", () => {
  beforeEach(() => db.worldMap.count.mockResolvedValue(0));

  it("без героя — порожній результат без запиту учасника", async () => {
    db.character.findFirst.mockResolvedValue(null);

    expect(await readPlayerDashboard("c1", "u1")).toEqual({ hero: null, activeBattle: null, hasWorld: false });
    expect(db.battleParticipant.findFirst).not.toHaveBeenCalled();
  });

  it("герой без бою", async () => {
    db.character.findFirst.mockResolvedValue({ id: "h1" });
    db.battleParticipant.findFirst.mockResolvedValue(null);

    expect(await readPlayerDashboard("c1", "u1")).toEqual({ hero: { id: "h1" }, activeBattle: null, hasWorld: false });
  });

  it("hasWorld — є коренева карта, також для гравця без героя", async () => {
    db.worldMap.count.mockResolvedValue(2);
    db.character.findFirst.mockResolvedValue(null);

    expect((await readPlayerDashboard("c1", "u1")).hasWorld).toBe(true);
    expect(db.worldMap.count).toHaveBeenCalledWith({ where: { campaignId: "c1", parentMarkerId: null } });
  });

  it("герой у бою — hp з tempHp, where з кампанією й active", async () => {
    db.character.findFirst.mockResolvedValue({ id: "h1" });
    db.battleParticipant.findFirst.mockResolvedValue({ battleId: "b1", currentHp: 5, maxHp: 20, tempHp: 3 });

    const res = await readPlayerDashboard("c1", "u1");

    expect(res.activeBattle).toEqual({ battleId: "b1", hp: { current: 5, max: 20, temp: 3 } });
    expect(db.battleParticipant.findFirst.mock.calls[0][0].where).toEqual({ sourceId: "h1", sourceType: "character", battle: { campaignId: "c1", status: "active" } });
    selectsOf().forEach((s) => FORBIDDEN.forEach((k) => expect(s).not.toHaveProperty(k)));
  });
});
