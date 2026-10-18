import { AttackType, CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

function unitIcon(file: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return base ? `${base}/storage/v1/object/public/unit-icons/${file}.webp` : undefined;
}

interface MockSpec {
  id: string;
  name: string;
  side: ParticipantSide;
  icon: string;
  hp: number;
  hpNow?: number;
  speed: number;
  gridSize?: number;
  attack: BattleAttack;
}

const melee = (name: string, damageDice: string): BattleAttack => ({
  name,
  type: AttackType.MELEE,
  attackBonus: 5,
  damageDice,
  damageType: "slashing",
});

const ranged = (name: string, range: string, damageDice: string): BattleAttack => ({
  name,
  type: AttackType.RANGED,
  attackBonus: 5,
  damageDice,
  damageType: "piercing",
  range,
});

const SPECS: MockSpec[] = [
  { id: "knight", name: "Лицар", side: ParticipantSide.ALLY, icon: "humans-knight", hp: 52, hpNow: 44, speed: 30, attack: melee("Меч", "1d8+3") },
  { id: "archer", name: "Лучниця", side: ParticipantSide.ALLY, icon: "humans-marksman", hp: 34, speed: 30, attack: ranged("Довгий лук", "80/320 фт", "1d8+2") },
  { id: "mage", name: "Маг", side: ParticipantSide.ALLY, icon: "mages-mage", hp: 26, hpNow: 18, speed: 30, attack: ranged("Магічна стріла", "60 фт", "2d4+2") },
  { id: "griffin", name: "Грифон", side: ParticipantSide.ALLY, icon: "humans-griffin", hp: 60, speed: 40, gridSize: 2, attack: melee("Кігті", "2d6+3") },
  { id: "skel1", name: "Скелет-воїн 1", side: ParticipantSide.ENEMY, icon: "necromancers-skeleton-warrior", hp: 30, speed: 30, attack: melee("Іржавий меч", "1d6+2") },
  { id: "skel2", name: "Скелет-воїн 2", side: ParticipantSide.ENEMY, icon: "necromancers-skeleton-warrior", hp: 30, hpNow: 9, speed: 30, attack: melee("Іржавий меч", "1d6+2") },
  { id: "skelArcher", name: "Скелет-лучник", side: ParticipantSide.ENEMY, icon: "necromancers-skeleton-archer", hp: 24, speed: 30, attack: ranged("Кістяний лук", "80/320 фт", "1d6+2") },
  { id: "dragon", name: "Кістяний дракон", side: ParticipantSide.ENEMY, icon: "necromancers-bone-dragon", hp: 120, hpNow: 96, speed: 40, gridSize: 2, attack: melee("Укус", "3d8+5") },
];

function build(s: MockSpec, index: number): BattleParticipant {
  return {
    basicInfo: {
      id: s.id,
      battleId: "mock-battle",
      sourceId: s.id,
      sourceType: s.side === ParticipantSide.ALLY ? ParticipantSourceType.CHARACTER : ParticipantSourceType.UNIT,
      name: s.name,
      avatar: unitIcon(s.icon),
      side: s.side,
      controlledBy: "mock-user",
    },
    abilities: {
      level: 5,
      initiative: 20 - index,
      baseInitiative: 20 - index,
      strength: 14,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      modifiers: { strength: 2, dexterity: 1, constitution: 1, intelligence: 0, wisdom: 0, charisma: 0 },
      proficiencyBonus: 3,
      race: "human",
    },
    combatStats: {
      maxHp: s.hp,
      currentHp: s.hpNow ?? s.hp,
      tempHp: 0,
      armorClass: 14,
      speed: s.speed,
      gridSize: s.gridSize,
      morale: 0,
      status: CombatStatus.ACTIVE,
      minTargets: 1,
      maxTargets: 1,
    },
    spellcasting: { spellSlots: {}, knownSpells: [] },
    battleData: { attacks: [s.attack], activeEffects: [], equippedArtifacts: [], resolvedAbilities: [] },
    actionFlags: { hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false, hasExtraTurn: false },
  };
}

export function buildMockParticipants(): BattleParticipant[] {
  return SPECS.map(build);
}
