import { abilityLabel, abilityLines, armorTotal, attackSheet, checkBonus } from "./lines";

import { DND_SKILL_META, DND_SKILLS } from "@/lib/constants";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { heroArchetype } from "@/lib/constants/hero-archetypes";
import { parseGoals } from "@/lib/schemas/character-goals";
import { slotLevels } from "@/lib/utils/battle/view";
import { heroBaseHp } from "@/lib/utils/characters/hero-hp";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { signed } from "@/lib/utils/format";
import type { BattleParticipant } from "@/types/battle";
import type { CharacterSheet, SheetArtifact, TokenColor } from "@/types/characters";
import type { BookSpell } from "@/types/spells";

export interface SheetInput {
  participant: BattleParticipant;
  viewer: CharacterSheet["viewer"];
  maxLevel: number;
  character: Record<AbilityKey, number> & {
    id: string;
    name: string;
    avatar: string | null;
    level: number;
    class: string;
    subclass: string | null;
    race: string;
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

  const savingThrows = flags(c.savingThrows);

  const skillFlags = flags(c.skills);

  const skills = DND_SKILLS.map((key) => {
    const meta = DND_SKILL_META[key];

    return { key, label: meta.label, ability: meta.ability, proficient: !!skillFlags[key], bonus: checkBonus(scores[meta.ability], !!skillFlags[key], prof) };
  });

  const passive = (key: string) => 10 + (skills.find((s) => s.key === key)?.bonus ?? 0);

  const attacks = p.battleData.attacks.map((a) => attackSheet(p, a));

  const hp = heroBaseHp(c);

  const hpBonus = p.combatStats.maxHp - hp.total;

  const { spellSaveDC, spellAttackBonus } = p.spellcasting;

  const grid = Object.fromEntries(ARTIFACT_GRID_9.map((cell) => [cell.key, input.artifacts.find((a) => a.slot === cell.key) ?? null]));

  return {
    viewer: input.viewer,
    maxLevel: input.maxLevel,
    identity: { id: c.id, name: c.name, avatar: c.avatar, level: c.level, className: c.class, archetype: heroArchetype(c.archetype).name, subclass: c.subclass, race: c.race, raceIcon: input.raceIcon, alignment: c.alignment },
    abilities: ABILITY_KEYS.map((key) => ({ key, score: scores[key], mod: getAbilityModifier(scores[key]), isPrimary: primary === key, lines: abilityLines(p, key, c[key]) })),
    primaryAbility: primary,
    proficiency: prof,
    hp: {
      total: p.combatStats.maxHp,
      lines: [...hp.breakdown.map((b) => ({ label: b, value: "", source: "level" as const })), ...(hpBonus ? [{ label: "Бонуси", value: signed(hpBonus) }] : [])],
    },
    armorClass: armorTotal(p),
    initiative: p.abilities.initiative,
    speed: p.combatStats.speed,
    morale: p.combatStats.morale,
    targets: { min: p.combatStats.minTargets ?? 1, max: p.combatStats.maxTargets ?? 1 },
    immunities: input.immunities,
    languages: strings(c.languages),
    proficiencies: proficiencyList(c.proficiencies),
    attacks,
    bestToHit: attacks.length ? Math.max(...attacks.map((a) => a.toHit.total)) : null,
    saves: ABILITY_KEYS.map((key) => ({ key, label: abilityLabel(key), ability: key, proficient: !!savingThrows[key], bonus: checkBonus(scores[key], !!savingThrows[key], prof) })),
    skills,
    passives: { perception: passive("perception"), investigation: passive("investigation"), insight: passive("insight") },
    magic: c.spellcastingAbility && spellSaveDC != null && spellAttackBonus != null ? { ability: abilityLabel(c.spellcastingAbility as AbilityKey), saveDC: spellSaveDC, attackBonus: spellAttackBonus } : null,
    slots: slotLevels(p).filter((s) => s.max > 0).map((s) => ({ level: s.level, count: s.max })),
    spells: input.spells,
    items: { grid, artifacts: input.artifacts, sets: p.battleData.artifactSets ?? [] },
    personalSkill: input.personalSkill,
    progression: input.progression,
    story: { biography: c.background?.trim() ? c.background : null, goals: parseGoals(c.goals),
      tokens: (c.tokens ?? []).map((t) => ({ id: t.id, color: t.color as TokenColor, label: t.label, createdAt: t.createdAt.toISOString() })),
    },
  };
}
