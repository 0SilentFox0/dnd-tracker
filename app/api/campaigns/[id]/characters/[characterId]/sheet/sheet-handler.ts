import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { CharacterClassesSchema } from "@/lib/schemas/classes";
import { loadStoryChapters } from "@/lib/server/scenario/player-story";
import { loadBookSpellsByIds } from "@/lib/server/spells/book-spells-by-ids";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";
import { loadEquippedArtifactRows } from "@/lib/utils/battle/participant/extract-artifacts";
import { loadCharacterContext } from "@/lib/utils/battle/participant/load-character-context";
import { getCharacterImmunities } from "@/lib/utils/characters/character-race-effects";
import { buildCharacterSheet } from "@/lib/utils/characters/sheet";
import type { Ruleset } from "@/lib/utils/rules";
import { normalizeTree, readUnlocked, skillPoints } from "@/lib/utils/skills/progression";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { CharacterSheet, SheetArtifact } from "@/types/characters";

export const loadSheetCharacter = (characterId: string) => prisma.character.findUnique({ where: { id: characterId }, include: { inventory: true, tokens: { orderBy: { createdAt: "desc" } } } });

export type SheetCharacter = NonNullable<Awaited<ReturnType<typeof loadSheetCharacter>>>;

export async function buildSheetFor(character: SheetCharacter, viewer: CharacterSheet["viewer"], campaign: { maxLevel: number; rules: Ruleset }): Promise<CharacterSheet> {
  const { context, race, tree } = await loadCharacterContext(character, campaign);

  const built = await createBattleParticipantFromCharacter(character, "", ParticipantSide.ALLY, undefined, context);

  const [participant] = applyBakedAuras([built], new Set([built.basicInfo.id]));

  const known = participant.spellcasting.knownSpells ?? [];

  const [spells, rows, chapters] = await Promise.all([
    loadBookSpellsByIds(character.campaignId, known),
    loadEquippedArtifactRows(character, context.artifactsById),
    loadStoryChapters(character.id, character.campaignId),
  ]);

  const artifacts: SheetArtifact[] = rows.map(({ row, slot }) => ({ id: row.id, name: row.name, icon: row.icon, slot, rarity: row.rarity, description: row.description, effects: abilitySummary("artifact", row) }));

  const personal = character.personalSkillId ? context.skillsById?.[character.personalSkillId] : undefined;

  const classEntries = context.classesById ? CharacterClassesSchema.safeParse(character.classes) : null;

  const classes = classEntries?.success && classEntries.data.length > 0 ? resolveClassEntries(classEntries.data, context.classesById ?? {}) : undefined;

  const normalized = tree ? normalizeTree(tree) : null;

  return buildCharacterSheet({
    participant,
    viewer,
    maxLevel: campaign.maxLevel,
    rules: campaign.rules,
    classes,
    chapters,
    character,
    raceIcon: race?.icon ?? null,
    immunities: getCharacterImmunities(character),
    artifacts,
    spells,
    personalSkill: personal ? { id: personal.id, name: personal.name, icon: personal.icon, description: personal.description } : null,
    progression: {
      freePoints: normalized ? skillPoints(normalized, readUnlocked(normalized, character.skillTreeProgress), character.level).free : 0,
      level: character.level,
      seenLevel: character.seenLevel,
    },
  });
}
