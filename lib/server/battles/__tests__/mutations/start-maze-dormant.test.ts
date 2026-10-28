import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fromCharacter: vi.fn(), fromUnit: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findMany: vi.fn(async () => [{ id: "h1" }]) },
    unit: { findMany: vi.fn(async () => [{ id: "u1" }]) },
  },
}));
vi.mock("@/lib/server/battles/mutations/start/start-build-context", () => ({
  buildCampaignContextForStart: vi.fn(async () => ({ campaignContext: {}, racesById: {} })),
}));
vi.mock("@/lib/server/battles/mutations/start/start-fair-scaling", () => ({
  scaleEnemiesForFairBattle: vi.fn(async (_c: string, _s: unknown, built: Array<{ battleData: object }>) => built.map((p) => ({ ...p, battleData: { ...p.battleData, hpMultiplier: 1.5 } }))),
}));
vi.mock("@/lib/utils/battle/participant", () => ({
  createBattleParticipantFromCharacter: mocks.fromCharacter,
  createBattleParticipantFromUnit: mocks.fromUnit,
}));

import { ParticipantSide } from "@/lib/constants/battle";
import { buildStartOrder } from "@/lib/server/battles/mutations/start/start-battle-handler";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";

const roar = resolved({ trigger: { event: "battleStart" }, effects: [{ kind: "dealDamage", amount: 4, target: "allEnemies" }] });

const setup = [
  { id: "h1", type: "character" as const, side: "ally" },
  { id: "u1", type: "unit" as const, side: "enemy", quantity: 1 },
];

describe("buildStartOrder: лабіринт", () => {
  it("вороги в лабіринті стартують сплячими й не спрацьовують на старті; без лабіринту — б'ють", async () => {
    mocks.fromCharacter.mockResolvedValue(makeParticipant({ id: "h1", hp: 20, maxHp: 20 }));
    mocks.fromUnit.mockImplementation(async () => makeParticipant({ id: "w1", side: ParticipantSide.ENEMY, abilities: [roar] }));

    const map = mazeMap();

    const inMaze = await buildStartOrder("b1", "c1", setup as never, map);

    expect(inMaze.order.find((p) => p.basicInfo.id === "h1")?.combatStats.currentHp).toBe(20);
    expect(inMaze.order.find((p) => p.basicInfo.id === "w1")?.battleData.dormant).toBe(true);

    const open = await buildStartOrder("b1", "c1", setup as never);

    expect(open.order.find((p) => p.basicInfo.id === "h1")?.combatStats.currentHp).toBe(16);
  });
});
