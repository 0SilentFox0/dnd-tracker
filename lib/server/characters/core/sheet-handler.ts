import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { CharacterClassesSchema } from "@/lib/schemas/classes";
import { loadBackground } from "@/lib/server/backgrounds/load";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import { loadStoryChapters } from "@/lib/server/scenario/player-story";
import { loadBookSpellsByIds } from "@/lib/server/spells/book-spells-by-ids";
import { readChoiceList } from "@/lib/utils/abilities/read";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { loadEquippedArtifactRows } from "@/lib/utils/battle/participant/extract-artifacts";
import { loadFeatsById } from "@/lib/utils/battle/participant/load-feats";
import { getCharacterImmunities } from "@/lib/utils/characters/character-race-effects";
import { pendingCount } from "@/lib/utils/characters/choices/pending";
import { choicesStateOf } from "@/lib/utils/characters/choices/picks";
import { choiceSelections, selectionNeedsFeats } from "@/lib/utils/characters/choices/selections";
import { visitPicks } from "@/lib/utils/characters/choices/walk";
import { buildCharacterSheet } from "@/lib/utils/characters/sheet";
import { attunedRefs, attunementRequired, pruneAttuned, resolveItemRow } from "@/lib/utils/items/resolve";
import type { Ruleset } from "@/lib/utils/rules";
import { normalizeTree, readUnlocked, skillPoints } from "@/lib/utils/skills/progression";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { CharacterSheet, SheetArtifact } from "@/types/characters";

export const loadSheetCharacter = (characterId: string) => prisma.character.findUnique({ where: { id: characterId }, include: { inventory: true, tokens: { orderBy: { createdAt: "desc" } } } });

export type SheetCharacter = NonNullable<Awaited<ReturnType<typeof loadSheetCharacter>>>;

export async function buildSheetFor(character: SheetCharacter, viewer: CharacterSheet["viewer"], campaign: { maxLevel: number; rules: Ruleset; allowPlayerEdit?: boolean }): Promise<CharacterSheet> {
  const { context, race, tree, participant } = await buildCharacterParticipant(character, campaign);

  const known = participant.spellcasting.knownSpells ?? [];

  const [spells, rows, chapters] = await Promise.all([
    loadBookSpellsByIds(character.campaignId, known),
    loadEquippedArtifactRows(character, context.artifactsById ?? {}, { rules: campaign.rules }),
    loadStoryChapters(character.id, character.campaignId),
  ]);

  const itemsOn = campaign.rules.items.enabled;

  const attuned = attunedRefs(character.inventory);

  const raw = context.artifactsById ?? {};

  const artifacts: SheetArtifact[] = rows.map(({ row, slot, carried }) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    slot,
    rarity: row.rarity,
    description: row.description,
    effects: abilitySummary("artifact", row),
    ...(itemsOn && attunementRequired(row.id, raw) && { attunement: attuned.includes(row.id) ? ("attuned" as const) : ("required" as const) }),
    ...(carried && { carried }),
  }));

  const personal = character.personalSkillId ? context.skillsById?.[character.personalSkillId] : undefined;

  const classEntries = context.classesById ? CharacterClassesSchema.safeParse(character.classes) : null;

  const classes = classEntries?.success && classEntries.data.length > 0 ? resolveClassEntries(classEntries.data, context.classesById ?? {}) : undefined;

  const state = choicesStateOf(character);

  const raceDefs = race ? readChoiceList(race.choices) : [];

  const classMode = !!classes?.some((e) => e.class);

  const choiceRace = race && raceDefs.length > 0 ? { id: race.id, name: race.name, choices: raceDefs } : null;

  const featsById = choiceRace || classMode ? await loadFeatsById(character.campaignId, selectionNeedsFeats(state, classMode)) : {};

  const background = classMode ? await loadBackground(character.campaignId, state.backgroundId) : null;

  const choices =
    choiceRace || classMode
      ? {
          selections: choiceSelections({ background, backgroundChoices: state.backgroundChoices, backgroundFeatPicks: state.backgroundFeatPicks, race: choiceRace, raceChoices: state.raceChoices, classes: classMode ? (classes ?? []) : [], feats: classMode ? state.feats : [], featsById, level: character.level }),
          pending: pendingCount(visitPicks(state, { backgroundsById: background ? { [background.id]: background } : {}, race: choiceRace, classesById: context.classesById ?? {}, featsById }, { level: character.level, classMode }), { featsById }),
        }
      : undefined;

  const normalized = tree ? normalizeTree(tree) : null;

  return buildCharacterSheet({
    participant,
    viewer,
    maxLevel: campaign.maxLevel,
    rules: campaign.rules,
    classes,
    ...(choices && { choices: { ...choices, canEdit: viewer.isDM || (viewer.isOwner && !!campaign.allowPlayerEdit && character.status !== CharacterStatus.PENDING) } }),
    chapters,
    character,
    raceIcon: race?.icon ?? null,
    immunities: getCharacterImmunities(character),
    artifacts,
    attunement: itemsOn ? { used: pruneAttuned(attuned, character.inventory ?? {}).filter((r) => resolveItemRow(r, raw)).length, limit: campaign.rules.items.attunementLimit } : null,
    spells,
    personalSkill: personal ? { id: personal.id, name: personal.name, icon: personal.icon, description: personal.description } : null,
    progression: {
      freePoints: normalized ? skillPoints(normalized, readUnlocked(normalized, character.skillTreeProgress), character.level).free : 0,
      level: character.level,
      seenLevel: character.seenLevel,
    },
  });
}
