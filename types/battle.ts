import type {
    AbilityUsageCounter,
    ResolvedAbility,
    StaticEffect,
} from './abilities';

import {
    AttackType,
    type CombatStatusType,
    ParticipantSide,
    type ParticipantSourceTypeValue,
} from '@/lib/constants/battle';
import type { CriticalEffect } from '@/lib/constants/critical-effects';
import type { HeroArchetypeKey } from '@/lib/constants/hero-archetypes';
import type { RulesEdition } from '@/lib/constants/rules';
import type { DndSkill } from '@/lib/constants/skills';
import type { WeaponTrait } from '@/lib/constants/weapon-traits';
import type { NonRandomEffect } from '@/lib/utils/abilities/schema';
import type { FxAuraKind } from '@/lib/utils/battle/fx';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { ModuleVocabId } from '@/lib/utils/rules/systems/vocab';
import type { InlineCast, SpellCost } from '@/lib/utils/spells/model/schema';
import type { StoredSpellSlots } from '@/lib/utils/spells/slot-keys';
import type {
    AnchoredZoneState,
    Direction8,
    GridPoint,
    PendingHit,
} from '@/types/battle-grid';
import type { AbilityKey, SetProgress } from '@/types/characters';
import { SkillLevel } from '@/types/skill-tree';
import type { LogLine } from '@/types/text';

export type { CriticalEffect };
export { AttackType, ParticipantSide };

export { SkillLevel };

export interface HitRiderState {
    attackKind: 'melee' | 'ranged' | 'any';
    extraDice: string;
    damageType: string;
    chargesLeft: number;
    casterId: string;
    consumeOnMiss?: boolean;
    save?: { ability: AbilityKey; dc?: number; onFail: NonRandomEffect[] };
}

export interface ActiveEffect {
    id: string;
    name: string;
    label?: LogLine;
    type: 'buff' | 'debuff' | 'condition';
    description?: LogLine;
    icon?: string;
    duration: number;
    appliedAt: {
        round: number;
        timestamp: Date;
    };
    effects: Array<{
        type: string;
        value: number;
        isPercentage?: boolean;
        damageType?: string;
    }>;
    dotDamage?: {
        damagePerRound: number;
        dice?: string;
        damageType: string;
        fromSpell?: boolean;
    };
    hotHeal?: {
        healPerRound: number;
        temp?: true;
    };
    fxElement?: string;
    fxAura?: FxAuraKind;
    breakOnDamage?: boolean;
    consumeOn?: 'ownAttack' | 'ownHit' | 'attackAgainst';
    expireAtTurnEnd?: boolean;
    countdownAtTurnStart?: boolean;
    armed?: boolean;
    charmOrigin?: { side: ParticipantSide; controlledBy: string };
    abilityKey?: string;
    /** Stripped server-side from non-DM views of participants whose stats the viewer cannot see (e.g. a concealed miscast condition) */
    concealed?: true;
    abilityEffects?: StaticEffect[];
    source?: {
        participantId: string;
        name: string;
        abilityName?: string;
        icon?: string | null;
        personal?: boolean;
    };
    permanent?: boolean;
    zone?: { ownerId: string; key: string };
    saveEnds?: { ability: AbilityKey; dc: number };
    escapeDc?: number;
    linkedTo?: string;
    concentrationOf?: { casterId: string; castId: string };
    hitRider?: HitRiderState;
    anchoredZone?: AnchoredZoneState;
    anchorOf?: string;
    concentration?: {
        castId: string;
        spellName: string;
        tracksEffects?: true;
    };
    exhaustionHpHalved?: number;
    exhaustionVariant?: RulesEdition;
}

export interface EquippedArtifact {
    artifactId: string;
    name: string;
    slot: string; // weapon, shield, cloak, ring, helmet, amulet, item
    setId?: string | null;
    bonuses: Record<string, number>;
    modifiers: Array<{
        type: string;
        value: number | string;
        isPercentage?: boolean;
    }>;
}

export interface BattleAttack {
    id?: string;
    name: string;
    type: AttackType;
    attackBonus: number;
    damageDice: string;
    damageType: string;
    range?: string;
    properties?: string;
    targetType?: 'target' | 'aoe';
    minTargets?: number;
    maxTargets?: number;
    damageDistribution?: number[];
    guaranteedDamage?: number;
    traits?: WeaponTrait[];
    versatileDice?: string;
    hand?: 'off';
    damageBonus?: number;
    weaponCategory?: 'simple' | 'martial';
    /** Opaque rule-system data (the system's codec narrows it) */
    system?: SystemSlot;
    ammo?: { capacity: number; reload?: number };
    reachCells?: number;
    blastRadius?: number;
    /** Shootable while enemies are adjacent */
    ignoresEngagement?: true;
    /** Damage comes from `damageDice`/`damageBonus` only, without hero level dice */
    noLevelDice?: true;
}

export interface BattleParticipantBasicInfo {
    id: string;
    battleId: string;
    sourceId: string;
    sourceType: ParticipantSourceTypeValue;
    instanceNumber?: number;
    instanceId?: string;
    name: string;
    avatar?: string;
    side: ParticipantSide;
    controlledBy: string;
    isExtraTurnSlot?: boolean;
    xp?: number;
}

export interface BattleParticipantAbilities {
    /** Opaque rule-system data (the system's codec narrows it) */
    system?: SystemSlot;
    creatureType?: string;
    cr?: number;
    damageModel?: '5e';
    level: number;
    initiative: number;
    baseInitiative: number;
    initiativeBonus?: number;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    modifiers: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };
    proficiencyBonus: number;
    race: string;
    raceId?: string;
    primaryAbility?: AbilityKey;
    meleeMultiplier?: number;
    rangedMultiplier?: number;
    magicMultiplier?: number;
    archetypeKey?: HeroArchetypeKey | 'universal';
    /** Legacy snapshots */
    archetypeName?: string;
    proficiencies?: { armor: string[]; weapons: string[] };
    saveProficiencies?: AbilityKey[];
    skillProficiencies?: DndSkill[];
    heroDice?: {
        melee?: Record<number, string>;
        ranged?: Record<number, string>;
    };
}

export interface SpellGrant {
    spellId: string;
    key?: string;
    label?: LogLine;
    via?: 'grant' | 'slotOrGrant';
    pool?: string;
    cost?: number;
    castLevel?: number;
    dc?: number;
    dcAbility?: AbilityKey;
    rest?: 'short' | 'long';
    attackBonus?: number;
    upcast?: { maxLevel: number; extraCost: number };
    legendaryOnly?: true;
    inline?: InlineCast;
    expiresRound?: number;
    concentrationOf?: { casterId: string; castId: string };
    castCost?: SpellCost;
}

export interface BattleParticipantCombatStats {
    maxHp: number;
    currentHp: number;
    tempHp: number;
    armorClass: number;
    speed: number;
    gridSize?: number;
    morale: number;
    moraleCap?: number;
    status: CombatStatusType;
    minTargets: number;
    maxTargets: number;
}

export interface BattleParticipantSpellcasting {
    spellcastingAbility?: AbilityKey;
    spellSaveDC?: number;
    spellAttackBonus?: number;
    spellSlots: StoredSpellSlots;
    knownSpells: string[];
    slotSpells?: string[]; // independent slotted-cast right, not knowledge from items/grants only
    grants?: SpellGrant[];
}

export interface AirborneState {
    landAt?: GridPoint;
    targetId?: string;
    since: number;
    percent: number;
    name: string;
}

export interface LegendaryState {
    actions: number;
    actionsLeft: number;
    resistLeft: number;
    /** Legendary resistances used so far; the lair module restores the pool from it */
    resistSpent?: number;
}

export type LegendaryOption =
    | { kind: 'attack'; attackIndex: number; targetId: string }
    | { kind: 'ability' | ModuleVocabId<'legendaryKinds'>; abilityKey: string; targetIds?: string[] };

export interface AbilityPool {
    label: string;
    max: number;
    rest: 'short' | 'long' | null;
    regain?: number;
    recharge?: 4 | 5 | 6;
}

export interface TransformState {
    unitId: string;
    castId: string;
    expiresRound?: number;
    concentrationOf?: { casterId: string; castId: string };
    saved: {
        maxHp: number;
        currentHp: number;
        tempHp: number;
        armorClass: number;
        speed: number;
        gridSize?: number;
        status: CombatStatusType;
        strength: number;
        dexterity: number;
        constitution: number;
        modifiers: {
            strength: number;
            dexterity: number;
            constitution: number;
        };
        attacks: BattleAttack[];
        movement?: BattleParticipantBattleData['movement'];
        creatureType?: string;
    };
}

export interface IngredientStockItem {
    id: string;
    key: string;
    name: string;
    worthGp: number;
    qty: number;
    used: number;
}

export interface IngredientStock {
    items: IngredientStockItem[];
    purseCp: number;
    usedCp: number;
}

export interface BattleParticipantBattleData {
    ingredientStock?: IngredientStock;
    /** attack id → shots left; seeded at battle start from the weapon capacity, never persisted between battles */
    ammo?: Record<string, number>;
    /** Per-system participant state; stored in the `state` column, not the snapshot */
    system?: SystemSlot;
    /** attack id → owner turn ends left until the magazine refills */
    reload?: Record<string, number>;
    pendingCast?: {
        spellId: string;
        spellName: string;
        remainingRounds: number;
        totalRounds: number;
        lastRound: number;
        grantKey?: string;
        slotKey?: string;
        castLevel?: number;
    };
    attacks: BattleAttack[];
    activeEffects: ActiveEffect[];
    equippedArtifacts: EquippedArtifact[];
    artifactSets?: SetProgress[];
    pendingExtraActions?: number;
    attacksLeft?: number;
    /** The participant lies at 0 HP rolling death saves; set by the system together with its slot */
    dying?: true;
    summonedBy?: string;
    phantomOf?: string;
    object?: {
        spellId: string;
        expiresRound?: number;
        concentrationOf?: { casterId: string; castId: string };
    };
    transform?: TransformState;
    dismissed?: boolean;
    extraTurnActive?: boolean;
    reserved?: boolean;
    revealPending?: boolean;
    resolvedAbilities: ResolvedAbility[];
    abilityUsage?: Record<string, AbilityUsageCounter>;
    pools?: Record<string, AbilityPool>;
    charmReturn?: { side: ParticipantSide; controlledBy: string };
    schoolMastery?: Record<string, 'basic' | 'advanced' | 'expert'>;
    auraZones?: Record<string, number>;
    position?: GridPoint;
    dormant?: boolean;
    facing?: Direction8;
    escaped?: boolean;
    mazeWakeRound?: number;
    movementUsed?: number;
    extraMovement?: number;
    readied?: { kind: 'attack'; round: number };
    turnStartPosition?: GridPoint;
    returnedThisTurn?: boolean;
    airborne?: AirborneState;
    hazardHitRound?: number;
    damagedByTypes?: string[];
    pendingHits?: PendingHit[];
    zoneHits?: Record<string, number>;
    damageMultiplier?: number;
    hpMultiplier?: number;
    legendary?: LegendaryState;
    lairResistances?: number;
    senses?: {
        darkvision?: number;
        blindsight?: number;
        tremorsense?: number;
        truesight?: number;
        passivePerception?: number;
    };
    movement?: {
        fly?: number;
        swim?: number;
        climb?: number;
        burrow?: number;
        hover?: boolean;
    };
    languages?: string;
    telepathy?: number;
}

export interface BattleParticipantActionFlags {
    hasUsedAction: boolean;
    hasUsedBonusAction: boolean;
    hasUsedReaction: boolean;
    hasExtraTurn: boolean;
}

export interface BattleParticipant {
    basicInfo: BattleParticipantBasicInfo;
    abilities: BattleParticipantAbilities;
    combatStats: BattleParticipantCombatStats;
    spellcasting: BattleParticipantSpellcasting;
    battleData: BattleParticipantBattleData;
    actionFlags: BattleParticipantActionFlags;
}

export interface BattlePreparationParticipant {
    id: string;
    type: ParticipantSourceTypeValue;
    side: ParticipantSide;
    quantity?: number;
    reserved?: number;
}
