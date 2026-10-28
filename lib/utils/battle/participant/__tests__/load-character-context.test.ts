import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  campaign: vi.fn(), artifacts: vi.fn(), classes: vi.fn(), feats: vi.fn(), backgrounds: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { campaign: { findUnique: mocks.campaign }, artifact: { findMany: mocks.artifacts } } }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedClasses: mocks.classes, getCachedFeats: mocks.feats, getCachedBackgrounds: mocks.backgrounds }));

import { loadCharacterContext } from "../load-character-context";

import type { CharacterFromPrisma } from "@/lib/utils/battle/types/participant";
import { sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { parseRules } from "@/lib/utils/rules/schema";

const character = {
  campaignId: "own-campaign", race: "Elf", classes: [{ classId: sorcerer.id, level: 4 }],
  backgroundId: "bg", feats: [{ id: "f", source: "origin" }], raceChoices: {},
} as unknown as CharacterFromPrisma;

const background = { id: "bg", campaignId: character.campaignId, name: "Scholar", icon: null, description: null, choices: [], skillProficiencies: ["arcana"], toolProficiencies: [], originFeatId: "f", equipmentText: null };

const feat = { id: "f", campaignId: character.campaignId, name: "Own feat", icon: null, description: null, type: "origin", repeatable: false, prerequisite: {}, choices: [], abilities: [] };

const settings = { maxLevel: 20, rules: parseRules({ classes: { enabled: true } }) };

describe("loadCharacterContext choice refs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.campaign.mockResolvedValue({ races: [], skillTrees: [] });
    mocks.classes.mockResolvedValue([{ ...sorcerer, campaignId: character.campaignId }]);
    mocks.feats.mockResolvedValue([feat]);
    mocks.backgrounds.mockResolvedValue([background]);
  });

  it("loads needed refs once, scoped to the character campaign", async () => {
    const { context } = await loadCharacterContext(character, settings);

    expect(context.featsById?.f.name).toBe("Own feat");
    expect(context.backgroundsById?.bg.originFeatId).toBe("f");
    expect(mocks.feats).toHaveBeenCalledExactlyOnceWith("own-campaign");
    expect(mocks.backgrounds).toHaveBeenCalledExactlyOnceWith("own-campaign");
    expect(mocks.campaign).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ where: { id: "own-campaign" } }));
    expect(mocks.artifacts).not.toHaveBeenCalled();
  });

  it("returns explicit empty maps when refs are unneeded", async () => {
    const { context } = await loadCharacterContext({ ...character, feats: [], backgroundId: null }, settings);

    expect(context.featsById).toEqual({});
    expect(context.backgroundsById).toEqual({});
    expect(mocks.feats).not.toHaveBeenCalled();
    expect(mocks.backgrounds).not.toHaveBeenCalled();
  });

  it("a missing background stays absent instead of becoming a fallback read", async () => {
    mocks.backgrounds.mockResolvedValue([]);
    mocks.feats.mockResolvedValue([]);

    const { context } = await loadCharacterContext(character, settings);

    expect(context.backgroundsById).toEqual({});
    expect(context.featsById).toEqual({});
    expect(mocks.backgrounds).toHaveBeenCalledExactlyOnceWith("own-campaign");
  });

  it("unknown classes keep HOMM fallback and do not load unused background/feats", async () => {
    const { context } = await loadCharacterContext({ ...character, classes: [{ classId: "missing", level: 4 }] }, settings);

    expect(context.featsById).toEqual({});
    expect(context.backgroundsById).toEqual({});
    expect(mocks.feats).not.toHaveBeenCalled();
    expect(mocks.backgrounds).not.toHaveBeenCalled();
  });

  it("race choices can need feats without class mode", async () => {
    mocks.campaign.mockResolvedValue({ races: [{ id: "elf", name: "Elf", choices: [{ id: "gift", label: "Gift", level: 1, count: 1, kind: "feat" }] }], skillTrees: [] });

    const { context } = await loadCharacterContext({ ...character, classes: [], backgroundId: null, raceChoices: { gift: [{ id: "f" }] } }, { ...settings, rules: parseRules({}) });

    expect(context.featsById?.f.name).toBe("Own feat");
    expect(context.backgroundsById).toEqual({});
    expect(mocks.classes).not.toHaveBeenCalled();
    expect(mocks.backgrounds).not.toHaveBeenCalled();
  });
});
