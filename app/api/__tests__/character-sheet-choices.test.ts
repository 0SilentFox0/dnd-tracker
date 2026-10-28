import { describe, expect, it, vi } from "vitest";

const loadFeatsById = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/battle/participant/load-feats", () => ({ loadFeatsById }));
vi.mock("@/lib/server/spells/book-spells-by-ids", () => ({ loadBookSpellsByIds: vi.fn(async () => []) }));
vi.mock("@/lib/server/scenario/player-story", () => ({ loadStoryChapters: vi.fn(async () => []) }));
vi.mock("@/lib/utils/battle/participant/extract-artifacts", async (importOriginal) => ({ ...(await importOriginal<object>()), loadEquippedArtifactRows: vi.fn(async () => []) }));
vi.mock("@/lib/server/characters/participant", () => ({ buildCharacterParticipant: vi.fn() }));

import { buildSheetFor } from "@/app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { elf } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const character = { id: "h", campaignId: "c1", name: "Лія", avatar: null, level: 1, class: "", subclass: null, race: "Elf", subrace: null, alignment: null, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 10, savingThrows: {}, skills: {}, languages: [], proficiencies: {}, spellcastingAbility: null, archetype: null, primaryAbility: null, background: null, goals: [], classes: [], raceChoices: {}, feats: [], personalSkillId: null, inventory: null, tokens: [], resources: {}, skillTreeProgress: {} };

const raceRow = (choices: unknown) => ({ id: elf.id, name: "Elf", choices, icon: null, passiveAbility: null, abilities: [] });

describe("buildSheetFor + choices", () => {
  it("HOMM race (no choices): no feat query, no choices block", async () => {
    vi.mocked(buildCharacterParticipant).mockResolvedValue({ context: {}, race: raceRow([]), tree: null, participant: createMockParticipant() } as never);

    const sheet = await buildSheetFor(character as never, { isDM: true, isOwner: false }, { maxLevel: 20, rules: DEFAULT_RULES });

    expect(loadFeatsById).not.toHaveBeenCalled();
    expect(sheet).not.toHaveProperty("choices");
  });

  it("race with choices: pending lineage + Keen Senses", async () => {
    vi.mocked(buildCharacterParticipant).mockResolvedValue({ context: {}, race: raceRow(elf.choices), tree: null, participant: createMockParticipant() } as never);

    const sheet = await buildSheetFor(character as never, { isDM: true, isOwner: false }, { maxLevel: 20, rules: DEFAULT_RULES });

    expect(sheet.choices?.pending).toBe(2);
  });
});
