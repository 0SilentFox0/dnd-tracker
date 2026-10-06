import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";
import { loadEquippedArtifactRows } from "@/lib/utils/battle/participant/extract-artifacts";
import { loadCharacterContext } from "@/lib/utils/battle/participant/load-character-context";
import { getCharacterImmunities } from "@/lib/utils/characters/character-race-effects";
import { buildCharacterSheet } from "@/lib/utils/characters/sheet";
import { normalizeTree, readUnlocked, skillPoints } from "@/lib/utils/skills/progression";
import { toBookSpell } from "@/lib/utils/spells/to-book-spell";
import type { CharacterSheet, SheetArtifact } from "@/types/characters";

export const loadSheetCharacter = (characterId: string) => prisma.character.findUnique({ where: { id: characterId }, include: { inventory: true } });

export type SheetCharacter = NonNullable<Awaited<ReturnType<typeof loadSheetCharacter>>>;

const SPELL_SELECT = {
  id: true,
  name: true,
  level: true,
  type: true,
  damageType: true,
  diceCount: true,
  diceType: true,
  savingThrow: true,
  hitCheck: true,
  description: true,
  icon: true,
  range: true,
  duration: true,
  concentration: true,
  damageElement: true,
  spellGroup: { select: { id: true, name: true } },
} as const;

export async function buildSheetFor(character: SheetCharacter, viewer: CharacterSheet["viewer"], maxLevel: number): Promise<CharacterSheet> {
  const { context, race, tree } = await loadCharacterContext(character, maxLevel);

  const built = await createBattleParticipantFromCharacter(character, "", ParticipantSide.ALLY, undefined, context);

  const [participant] = applyBakedAuras([built], new Set([built.basicInfo.id]));

  const known = participant.spellcasting.knownSpells ?? [];

  const spells = known.length ? await prisma.spell.findMany({ where: { campaignId: character.campaignId, id: { in: known } }, select: SPELL_SELECT }) : [];

  const rows = await loadEquippedArtifactRows(character, context.artifactsById);

  const artifacts: SheetArtifact[] = rows.map(({ row, slot }) => ({ id: row.id, name: row.name, icon: row.icon, slot, rarity: row.rarity, description: row.description, effects: abilitySummary("artifact", row) }));

  const personal = character.personalSkillId ? context.skillsById?.[character.personalSkillId] : undefined;

  const normalized = tree ? normalizeTree(tree) : null;

  return buildCharacterSheet({
    participant,
    viewer,
    maxLevel,
    character,
    raceIcon: race?.icon ?? null,
    immunities: getCharacterImmunities(character, race as never),
    artifacts,
    spells: spells.map(toBookSpell),
    personalSkill: personal ? { id: personal.id, name: personal.name, icon: personal.icon, description: personal.description } : null,
    progression: {
      freePoints: normalized ? skillPoints(normalized, readUnlocked(normalized, character.skillTreeProgress), character.level).free : 0,
      level: character.level,
      seenLevel: character.seenLevel,
    },
  });
}
