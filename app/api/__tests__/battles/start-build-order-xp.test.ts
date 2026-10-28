import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fromCharacter: vi.fn(), fromUnit: vi.fn(), scale: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findMany: vi.fn(async () => [{ id: "h1" }]) },
    unit: { findMany: vi.fn(async () => [{ id: "u1" }]) },
  },
}));
vi.mock("@/app/api/campaigns/[id]/battles/[battleId]/start/start-build-context", () => ({
  buildCampaignContextForStart: vi.fn(async () => ({ campaignContext: {}, racesById: {} })),
}));
vi.mock("@/app/api/campaigns/[id]/battles/[battleId]/start/start-fair-scaling", () => ({ scaleEnemiesForFairBattle: mocks.scale }));
vi.mock("@/lib/utils/battle/participant", () => ({
  createBattleParticipantFromCharacter: mocks.fromCharacter,
  createBattleParticipantFromUnit: mocks.fromUnit,
}));

import { buildStartOrder } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-battle-handler";
import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const setup = [
  { id: "h1", type: "character" as const, side: ParticipantSide.ALLY },
  { id: "u1", type: "unit" as const, side: ParticipantSide.ENEMY, quantity: 1 },
];

describe("buildStartOrder: режим балансу", () => {
  beforeEach(() => {
    mocks.scale.mockReset();
    mocks.scale.mockImplementation(async (_c: string, _s: unknown, built: unknown) => built);
    mocks.fromCharacter.mockResolvedValue(makeParticipant({ id: "h1" }));
    mocks.fromUnit.mockResolvedValue(makeParticipant({ id: "w1", side: ParticipantSide.ENEMY }));
  });

  it("xp — без масштабування ворогів", async () => {
    await buildStartOrder("b1", "c1", setup, null, { ...DEFAULT_RULES, encounters: { balance: "xp", edition: "2014", autoXp: false } });

    expect(mocks.scale).not.toHaveBeenCalled();
  });

  it("fair — як раніше", async () => {
    await buildStartOrder("b1", "c1", setup, null, DEFAULT_RULES);

    expect(mocks.scale).toHaveBeenCalledTimes(1);
  });
});
