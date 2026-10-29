import type { PublicUser } from "./campaigns";
import type { CharacterClassEntry, ClassProgression } from "./classes";
import type { EquippedItems, InventoryItem } from "./inventory";
import type { StoryChapter } from "./scenario";
import type { BookSpell } from "./spells";

import type { AbilityKey } from "@/lib/constants/abilities";
import { type SpellcastingAbility } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import type { CharacterLogKindValue } from "@/lib/constants/character-log";
import { type CharacterTypeValue, type GoalAuthorValue, type GoalKind, type GoalStatus, type TOKEN_COLORS } from "@/lib/constants/characters";
import type { HeroArchetypeKey } from "@/lib/constants/hero-archetypes";
import type { DndSkill } from "@/lib/constants/skills";
import type { AbilityFlowSummary } from "@/lib/utils/abilities/segments";
import type { BackgroundSelection } from "@/types/backgrounds";
import type { CharacterFeat, Picks, SheetChoices, TextParams } from "@/types/choices";

export type { AbilityKey };


export type TokenColor = (typeof TOKEN_COLORS)[number];

export interface CharacterToken {
  id: string;
  color: TokenColor;
  label: string;
  createdAt: string;
}

export interface CharacterGoal {
  id: string;
  text: string;
  title?: string;
  kind?: GoalKind;
  status: GoalStatus;
  author: GoalAuthorValue;
}

/**
 * Згрупована структура даних персонажа (як використовується в формі)
 */
export interface CharacterFormData {
  basicInfo: {
    name: string;
    type: CharacterTypeValue;
    controlledBy: string;
    level: number;
    class: string;
    subclass?: string;
    classes?: CharacterClassEntry[];
    archetype?: string;
    race: string;
    subrace?: string;
    alignment?: string;
    background?: string;
  backgroundId?: string | null;
  backgroundChoices?: Picks;
  backgroundFeatPicks?: Picks;
    avatar?: string;
  };
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    primaryAbility: AbilityKey | null;
  };
  combatStats: {
    armorClass: number;
    initiative: number;
    speed: number;
    minTargets: number;
    maxTargets: number;
    morale: number;
  };
  skills: {
    savingThrows: Record<string, boolean>;
    skills: Record<string, boolean>;
  };
  spellcasting: {
    spellcastingAbility?: SpellcastingAbility;
    spellSlots?: Record<string, { max: number; current: number }>;
    knownSpells: string[];
  };
  roleplay: {
    languages: string[];
    proficiencies: Record<string, string[]>;
    immunities?: string[];
  };
  /** Уміння: скіл з групи «Персональні» */
  abilities: {
    personalSkillId: string;
  };
  choices?: Partial<BackgroundSelection> & { raceChoices: Picks; feats: CharacterFeat[] };
}

/**
 * Плоска структура персонажа (як зберігається в БД та повертається з API)
 */
export interface Character {
  id: string;
  campaignId: string;
  type: string;
  controlledBy: string;
  name: string;
  level: number;
  class: string;
  subclass?: string;
  raceChoices?: Picks;
  feats?: CharacterFeat[];
  classes?: CharacterClassEntry[];
  race: string;
  subrace?: string;
  alignment?: string;
  background?: string;
  backgroundId?: string | null;
  backgroundChoices?: Picks;
  backgroundFeatPicks?: Picks;
  avatar?: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  armorClass: number;
  initiative: number;
  speed: number;
  savingThrows: Record<string, boolean>;
  skills: Record<string, boolean>;
  spellcastingAbility?: SpellcastingAbility | null;
  spellSlots?: Record<string, { max: number; current: number }>;
  knownSpells: string[];
  languages: string[];
  proficiencies: Record<string, string[]>;
  immunities?: string[];
  morale?: number;
  minTargets: number;
  maxTargets: number;
  personalSkillId?: string | null;
  primaryAbility?: AbilityKey | null;
  goals?: CharacterGoal[];
  archetype?: string | null;
  /** Прогрес по деревах прокачки: skillTreeId → { unlockedSkills } */
  skillTreeProgress?: Record<
    string,
    { level?: string; unlockedSkills?: string[] }
  >;
  seenLevel?: number | null;
  createdAt: string;
  updatedAt: string;
  user?: PublicUser | null;
  inventory?: {
    id: string;
    equipped: EquippedItems;
    backpack: InventoryItem[];
    items: InventoryItem[];
    gold: number;
    silver: number;
    copper: number;
  };
}

/** Рядок списку персонажів кампанії (GET /characters). */
export type CharacterListItem = Pick<
  Character,
  "id" | "campaignId" | "type" | "controlledBy" | "name" | "level" | "class" | "race" | "subrace" | "avatar" | "constitution" | "archetype" | "classes" | "armorClass" | "initiative"
> & { user?: { displayName: string } | null; reviewNote?: string | null; experience?: number; inspiration?: boolean; resources?: CharacterResources };

export type SheetLineSource = "base" | "ability" | "proficiency" | "weapon" | "level" | "dice" | "skill" | "race" | "artifact" | "artifactSet" | "unit" | "character" | "effect" | "action" | "multiplier";

export interface SheetLine {
  label: string;
  params?: TextParams;
  suffix?: string;
  value: string;
  source?: SheetLineSource;
}

export interface SheetTotal {
  total: number;
  lines: SheetLine[];
}

export interface SheetAbility {
  key: AbilityKey;
  score: number;
  mod: number;
  isPrimary: boolean;
  lines: SheetLine[];
}

export interface SheetAttack {
  id: string;
  name: string;
  kind: AttackType;
  toHit: SheetTotal;
  avgDamage: SheetTotal;
}

export interface SheetCheck {
  key: string;
  label: string;
  ability: AbilityKey;
  bonus: number;
  proficient: boolean;
  expertise?: true;
}

export interface SheetArtifact {
  id: string;
  name: string;
  icon: string | null;
  slot: string;
  rarity: string | null;
  description: string | null;
  effects: AbilityFlowSummary[];
  attunement?: "attuned" | "required";
  carried?: true;
}

export interface SetProgress {
  setId: string;
  name: string;
  have: number;
  total: number;
  complete: boolean;
  effects: AbilityFlowSummary[];
}

export interface CharacterSheet {
  viewer: { isDM: boolean; isOwner: boolean };
  review: { pending: boolean; note: string | null };
  maxLevel: number;
  identity: { id: string; name: string; avatar: string | null; level: number; className: string; archetype: string; subclass: string | null; race: string; subrace?: string | null; raceIcon: string | null; alignment: string | null };
  abilities: SheetAbility[];
  primaryAbility: AbilityKey | null;
  proficiency: number;
  hp: SheetTotal;
  armorClass: SheetTotal;
  initiative: number;
  speed: number;
  morale: number;
  targets: { min: number; max: number };
  immunities: string[];
  languages: string[];
  proficiencies: string[];
  attacks: SheetAttack[];
  bestToHit: number | null;
  saves: SheetCheck[];
  skills: SheetCheck[];
  passives: { perception: number; investigation: number; insight: number };
  magic: { ability: AbilityKey; saveDC: number; attackBonus: number } | null;
  hitDice: string | null;
  classTable?: string[];
  classProgression?: ClassProgression[];
  pact: { level: number; max: number; current: number } | null;
  slots: { level: number; count: number; current: number }[];
  rest: SheetRest | null;
  spells: BookSpell[];
  items: { grid: Record<string, SheetArtifact | null>; artifacts: SheetArtifact[]; sets: SetProgress[]; attunement?: { used: number; limit: number } };
  personalSkill: { id: string; name: string; icon: string | null; description: string | null } | null;
  story: { biography: string | null; notes: string | null; goals: CharacterGoal[]; tokens: CharacterToken[]; chapters: StoryChapter[] };
  progression: { freePoints: number; level: number; seenLevel: number | null };
  choices?: SheetChoices;
}

export interface RosterHero {
  id: string;
  name: string;
  avatar: string | null;
  type: CharacterTypeValue;
  equipped: Record<string, { id: string; name: string; gear?: true }>;
}

export interface DraftInput {
  name: string;
  race: string;
  class: string;
  classId?: string;
  archetype: HeroArchetypeKey;
  alignment?: string;
  background?: string;
  backgroundId?: string | null;
  backgroundChoices?: Picks;
  backgroundFeatPicks?: Picks;
  avatar?: string;
  method: "standard" | "pointBuy";
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  primaryAbility?: AbilityKey;
  goals?: Array<{ text: string; kind: GoalKind }>;
  choices?: Partial<BackgroundSelection> & { raceChoices?: Picks; feats?: CharacterFeat[]; classChoices?: Picks };
}

export type RestKindValue = "short" | "long";

export interface CharacterResources {
  hp?: number;
  tempHp?: number;
  dead?: boolean;
  /** ключі "1".."9" і "pact" */
  slotsSpent?: Record<string, number>;
  /** classId → витрачено */
  hitDiceSpent?: Record<string, number>;
  /** ключ вміння (ResolvedAbility.key) → використання perRest */
  charges?: Record<string, { used: number; rest: RestKindValue | null; /** uses restored by a short rest even though `rest` is long */ regain?: number }>;
  exhaustion?: number;
  shortRestOpen?: boolean;
}

export type RestBody = { kind: "short" | "long" | "close"; characterIds: string[] };

export type SheetRollSubject = { kind: "check"; skill: DndSkill } | { kind: "check"; ability: AbilityKey } | { kind: "save"; ability: AbilityKey };

export type SheetRollBody = SheetRollSubject & { useInspiration?: boolean };

export interface SheetRollResult {
  label: string;
  rolls: number[];
  roll: number;
  mod: number;
  bonus: number;
  total: number;
  mode: "advantage" | "disadvantage" | "normal";
  autoFail: boolean;
  inspirationUsed: boolean;
}

export interface HitDieResult {
  die: number;
  roll: number;
  healed: number;
  hpBefore: number;
  hpAfter: number;
  resources: CharacterResources;
}

export type AwardXpBody = { characterIds: string[]; amount: number; split: boolean; note?: string };

export type ResourcesEditBody = { hp?: number; tempHp?: number; exhaustion?: number; dead?: boolean; reset?: true; charges?: Record<string, number> };

export interface SheetRest {
  persist: boolean;
  hp: { current: number; max: number; temp: number } | null;
  dead: boolean;
  exhaustion: number;
  shortRestOpen: boolean;
  hitDice: { classId: string; name: string; die: number; total: number; spent: number }[];
  charges: { key: string; name: string; uses: number; used: number; rest: "short" | "long" | null }[];
  arcaneRecovery: { budget: number; maxSlotLevel: number; used: boolean; slots: { level: number; spent: number }[] } | null;
  inspiration: boolean | null;
  xp: { value: number; next: number | null; levelUp: boolean } | null;
}

export interface CharacterLogEntry {
  id: string;
  kind: CharacterLogKindValue;
  data: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; displayName: string | null } | null;
}
