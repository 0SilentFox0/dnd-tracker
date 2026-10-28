import { abilityLabel, abilityLines, armorTotal, attackSheet, checkBonus } from "./lines";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { CharacterStatus } from "@/lib/constants/characters";
import { heroArchetype } from "@/lib/constants/hero-archetypes";
import { DND_SKILL_META, DND_SKILLS } from "@/lib/constants/skills";
import { parseGoals } from "@/lib/schemas/character-goals";
import { calculateInitiative } from "@/lib/utils/battle/turn/initiative";
import { pactSlot, slotLevels } from "@/lib/utils/battle/view";
import { describeFeatPicks } from "@/lib/utils/characters/choices/describe";
import type { ChoiceSelections } from "@/lib/utils/characters/choices/selections";
import { hitDiceLabel } from "@/lib/utils/characters/classes";
import { classTableLines } from "@/lib/utils/characters/classes/columns";
import { characterBaseHp } from "@/lib/utils/characters/hero-hp";
import { buildRestBlock } from "@/lib/utils/characters/sheet/rest-block";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { signed } from "@/lib/utils/common/format";
import { heroHpFormula, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { CharacterSheet, SheetArtifact, TokenColor } from "@/types/characters";
import type { ResolvedClassEntry } from "@/types/classes";
import type { StoryChapter } from "@/types/scenario";
import type { BookSpell } from "@/types/spells";

export interface SheetInput {
  participant: BattleParticipant;
  viewer: CharacterSheet["viewer"];
  maxLevel: number;
  rules?: Ruleset;
  classes?: ResolvedClassEntry[];
  chapters?: StoryChapter[];
  attunement?: { used: number; limit: number } | null;
  choices?: { selections: ChoiceSelections; pending: number; canEdit?: boolean };
  character: Record<AbilityKey, number> & {
    id: string;
    name: string;
    avatar: string | null;
    level: number;
    class: string;
    subclass: string | null;
    race: string;
    subrace?: string | null;
    alignment: string | null;
    armorClass: number;
    savingThrows: unknown;
    skills: unknown;
    languages: unknown;
    proficiencies: unknown;
    spellcastingAbility: string | null;
    archetype: string | null;
    primaryAbility: string | null;
    background: string | null;
    goals: unknown;
    notes?: string | null;
    resources?: unknown;
    inspiration?: boolean;
    experience?: number;
    status?: string;
    reviewNote?: string | null;
    tokens?: { id: string; color: string; label: string; createdAt: Date }[];
  };
  raceIcon: string | null;
  immunities: string[];
  artifacts: SheetArtifact[];
  spells: BookSpell[];
  personalSkill: CharacterSheet["personalSkill"];
  progression: CharacterSheet["progression"];
}

const flags = (raw: unknown) => (raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, boolean>) : {});

const strings = (raw: unknown) => (Array.isArray(raw) ? raw.map(String) : []);

const proficiencyList = (raw: unknown) =>
  raw && typeof raw === "object" ? Object.values(raw as Record<string, unknown>).flatMap((v) => (Array.isArray(v) ? v.map(String) : [])) : [];

export function buildCharacterSheet(input: SheetInput): CharacterSheet {
  const { participant: p, character: c } = input;

  const prof = p.abilities.proficiencyBonus;

  const scores = Object.fromEntries(ABILITY_KEYS.map((k) => [k, p.abilities[k]])) as Record<AbilityKey, number>;

  const primary = p.abilities.primaryAbility ?? null;

  const manualSaves = flags(c.savingThrows);

  const isSaveProficient = (key: AbilityKey) => !!manualSaves[key] || !!p.abilities.saveProficiencies?.includes(key);

  const skillFlags = flags(c.skills);

  const fromChoices = new Set<string>(input.choices?.selections.skills ?? []);

  const expert = new Set<string>(input.choices?.selections.expertise ?? []);

  const skills = DND_SKILLS.map((key) => {
    const meta = DND_SKILL_META[key];

    const proficient = !!skillFlags[key] || fromChoices.has(key);

    const expertise = proficient && expert.has(key);

    return { key, label: meta.label, ability: meta.ability, proficient, bonus: checkBonus(scores[meta.ability], proficient, expertise ? prof * 2 : prof), ...(expertise && { expertise: true as const }) };
  });

  const passive = (key: string) => 10 + (skills.find((s) => s.key === key)?.bonus ?? 0);

  const attacks = p.battleData.attacks.map((a) => attackSheet(p, a));

  const classEntries = input.classes?.some((e) => e.class) ? input.classes : null;

  const showSubrace = !!input.choices && (!!classEntries || input.choices.selections.lineage !== null);

  const hp = characterBaseHp(c, { entries: input.classes, formula: input.rules && heroHpFormula(input.rules.heroScaling) });

  const hpBonus = p.combatStats.maxHp - hp.total;

  const { spellSaveDC, spellAttackBonus } = p.spellcasting;

  const grid = Object.fromEntries(ARTIFACT_GRID_9.map((cell) => [cell.key, input.artifacts.find((a) => a.slot === cell.key) ?? null]));

  return {
    viewer: input.viewer,
    review: { pending: c.status === CharacterStatus.PENDING, note: c.status === CharacterStatus.PENDING ? (c.reviewNote ?? null) : null },
    maxLevel: input.maxLevel,
    identity: { id: c.id, name: c.name, avatar: c.avatar, level: c.level, className: c.class, archetype: heroArchetype(c.archetype).name, subclass: c.subclass, race: c.race, ...(showSubrace && c.subrace && { subrace: c.subrace }), raceIcon: input.raceIcon, alignment: c.alignment },
    abilities: ABILITY_KEYS.map((key) => ({ key, score: scores[key], mod: getAbilityModifier(scores[key]), isPrimary: primary === key, lines: abilityLines(p, key, c[key]) })),
    primaryAbility: primary,
    proficiency: prof,
    hp: {
      total: p.combatStats.maxHp,
      lines: [...hp.breakdown.map((b) => ({ label: b, value: "", source: "level" as const })), ...(hpBonus ? [{ label: "Бонуси", value: signed(hpBonus) }] : [])],
    },
    armorClass: armorTotal(p),
    initiative: calculateInitiative(p),
    speed: p.combatStats.speed,
    morale: p.combatStats.morale,
    targets: { min: p.combatStats.minTargets ?? 1, max: p.combatStats.maxTargets ?? 1 },
    immunities: input.immunities,
    languages: strings(c.languages),
    proficiencies: proficiencyList(c.proficiencies),
    attacks,
    bestToHit: attacks.length ? Math.max(...attacks.map((a) => a.toHit.total)) : null,
    saves: ABILITY_KEYS.map((key) => ({ key, label: abilityLabel(key), ability: key, proficient: isSaveProficient(key), bonus: checkBonus(scores[key], isSaveProficient(key), prof) })),
    skills,
    passives: { perception: passive("perception"), investigation: passive("investigation"), insight: passive("insight") },
    magic: c.spellcastingAbility && spellSaveDC != null && spellAttackBonus != null ? { ability: abilityLabel(c.spellcastingAbility as AbilityKey), saveDC: spellSaveDC, attackBonus: spellAttackBonus } : null,
    hitDice: classEntries ? hitDiceLabel(classEntries) : null,
    ...(classEntries && { classTable: classTableLines(classEntries) }),
    pact: pactSlot(p),
    slots: slotLevels(p).filter((s) => s.max > 0).map((s) => ({ level: s.level, count: s.max, current: s.current })),
    rest: buildRestBlock({ participant: p, character: c, classes: input.classes, rules: input.rules, maxLevel: input.maxLevel }),
    spells: input.spells,
    items: { grid, artifacts: input.artifacts, sets: p.battleData.artifactSets ?? [], ...(input.attunement && { attunement: input.attunement }) },
    personalSkill: input.personalSkill,
    progression: input.progression,
    story: { biography: c.background?.trim() ? c.background : null, goals: parseGoals(c.goals), notes: input.viewer.isOwner ? (c.notes ?? null) : null, chapters: input.chapters ?? [],
      tokens: (c.tokens ?? []).map((t) => ({ id: t.id, color: t.color as TokenColor, label: t.label, createdAt: t.createdAt.toISOString() })),
    },
    ...(input.choices && {
      choices: {
        pending: input.choices.pending,
        ...(input.choices.canEdit !== undefined && { canEdit: input.choices.canEdit }),
        lineage: input.choices.selections.lineage,
        feats: input.choices.selections.feats.map((f) => ({ key: f.key, id: f.feat.id, name: f.feat.name, type: f.feat.type, from: f.from, picks: describeFeatPicks(f.feat, f.picks) })),
        options: input.choices.selections.options,
        spellSources: Object.fromEntries(input.choices.selections.spells.map((sp) => [sp.spellId, sp.label])),
        expertise: input.choices.selections.expertise,
      },
    }),
  };
}
