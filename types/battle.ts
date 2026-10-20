import type { AbilityUsageCounter, ResolvedAbility, StaticEffect } from "./abilities";

import { type SpellcastingAbility } from "@/lib/constants/abilities";
import { AttackType, type CombatStatusType, type MAZE_DIFFICULTIES, type MAZE_MARK_SYMBOLS, ParticipantSide, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import type { WEATHER_KINDS } from "@/lib/constants/battle-weather";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { FxImpact } from "@/lib/utils/battle/fx";
import type { MazeView } from "@/lib/utils/battle/modes/maze";
import type { AbilityKey, SetProgress } from "@/types/characters";
import { SkillLevel } from "@/types/skill-tree";

export type { CriticalEffect };
export { AttackType, ParticipantSide };
export { SkillLevel };

/**
 * Типи для активних ефектів
 */
export interface ActiveEffect {
  id: string;
  name: string;
  type: "buff" | "debuff" | "condition";
  description?: string;
  icon?: string;
  duration: number; // кількість раундів що залишилось
  appliedAt: {
    round: number;
    timestamp: Date;
  };
  effects: Array<{
    type: string; // attack_bonus, ac_bonus, poison_damage, тощо
    value: number;
    isPercentage?: boolean;
    damageType?: string; // для DOT: fire, poison, тощо
  }>;
  dotDamage?: {
    damagePerRound: number;
    damageType: string;
    fromSpell?: boolean;
  };
  hotHeal?: {
    healPerRound: number;
  };
  /** Сирий тип шкоди заклинання, що наклало ефект (для візуалу ауры) */
  fxElement?: string;
  breakOnDamage?: boolean;
  consumeOn?: "ownAttack" | "ownHit" | "attackAgainst";
  expireAtTurnEnd?: boolean;
  /** Старий відлік: тривалість зменшується на початку ходу власника (мітки «раз за раунд», ефекти критів «до наступного ходу цілі») */
  countdownAtTurnStart?: boolean;
  /** Був на власнику на початку його поточного ходу: наприкінці ходу тривалість зменшується */
  armed?: boolean;
  charmOrigin?: { side: ParticipantSide; controlledBy: string };
  abilityKey?: string;
  abilityEffects?: StaticEffect[];
  source?: { participantId: string; name: string; abilityName?: string; icon?: string | null; personal?: boolean };
  /** постійний ефект (пасивне персональне вміння, зона аури) — без відліку раундів */
  permanent?: boolean;
  /** ефект зони аури: діє, поки власник живий; key — спільний для однакових аур різних власників */
  zone?: { ownerId: string; key: string };
}

/**
 * Типи для екіпірованих артефактів
 */
export interface EquippedArtifact {
  artifactId: string;
  name: string;
  slot: string; // weapon, shield, cloak, ring, helmet, amulet, item
  /** FK на ArtifactSet — для перевірки повного сету в бою */
  setId?: string | null;
  bonuses: Record<string, number>; // бонуси до статів
  modifiers: Array<{
    type: string;
    value: number | string;
    isPercentage?: boolean;
  }>;
}


/**
 * Типи для атак
 */
export interface BattleAttack {
  id?: string;
  name: string;
  type: AttackType;
  attackBonus: number; // базовий бонус
  damageDice: string; // "2d6", "1d8+3" тощо
  damageType: string; // slashing, piercing, fire, тощо
  range?: string; // для ranged
  properties?: string; // спеціальні властивості
  /** Тип цілі: одна ціль або AOE (область) */
  targetType?: "target" | "aoe";
  minTargets?: number;
  maxTargets?: number;
  /** Розподіл шкоди по цілях (%): [50, 30, 20] — перша 50%, друга 30%, третя 20%. Сума = 100. */
  damageDistribution?: number[];
  /** Гарантована шкода — застосовується навіть при промаху. */
  guaranteedDamage?: number;
}

/**
 * Повна структура учасника бою (BattleParticipant)
 * Містить всі дані персонажа/юніта для бою
 */
/**
 * Базова інформація про учасника бою
 */
export interface BattleParticipantBasicInfo {
  id: string; // унікальний ID учасника В ЦІЙ БИТВІ
  battleId: string; // ID битви
  sourceId: string; // оригінальний ID character/unit
  sourceType: ParticipantSourceTypeValue;
  instanceNumber?: number; // номер копії (для units: 1, 2, 3...)
  instanceId?: string; // унікальний ID інстансу (для units)
  name: string;
  avatar?: string;
  side: ParticipantSide;
  controlledBy: string; // userId (для players) або CONTROLLED_BY_DM (для NPC/units)
  isExtraTurnSlot?: boolean; // чи є цей слот додатковим ходом
}

/**
 * Характеристики учасника бою
 */
export interface BattleParticipantAbilities {
  level: number;
  initiative: number; // поточна ініціатива (з урахуванням бонусів)
  baseInitiative: number; // базова ініціатива (без тимчасових бонусів)
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
  /** Race.id для расових модифікаторів заклинань */
  raceId?: string;
  primaryAbility?: AbilityKey;
  /** Множник шкоди ближнього бою від архетипу (лише character) */
  meleeMultiplier?: number;
  rangedMultiplier?: number;
  magicMultiplier?: number;
  archetypeName?: string;
}

export interface GridPoint {
  x: number;
  y: number;
}

export type Direction8 = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type MazeDifficulty = (typeof MAZE_DIFFICULTIES)[number];

export type MazeMarkSymbol = (typeof MAZE_MARK_SYMBOLS)[number];

export interface MazeMark {
  symbol: MazeMarkSymbol;
  color: string;
  by: string;
}

/** walls — ребра "x:y:e" / "x:y:s"; fog і marks — за ключем клітинки "x:y" */
export interface MazeConfig {
  walls: string[];
  exit: GridPoint | null;
  difficulty: MazeDifficulty;
  teleports: [GridPoint, GridPoint][];
  fog: string[];
  marks: Record<string, MazeMark>;
  dark: boolean;
  /** перший крок героя зроблено: «Згенерувати»/«Розкидати старти» більше недоступні */
  moved?: boolean;
}

export type TemplateShape = "circle" | "cube" | "cone" | "line";

/** size у футах: радіус кола, сторона куба, довжина конуса/лінії */
export interface SpellTemplate {
  shape: TemplateShape;
  size: number;
  /** Кільце: клітинка прицілу кола не вражається */
  hollow?: boolean;
}

export type WeatherKind = (typeof WEATHER_KINDS)[number];

/** Карта бою: сітка поверх фону; клітинка = 5 футів */
export interface BattleMapConfig {
  cols: number;
  rows: number;
  background: string | null;
  /** Прозорість ліній сітки, 0..1 */
  opacity: number;
  /** Неігрові клітинки (ключі "x:y") */
  blocked?: string[];
  /** Місцевість за ключем "x:y" */
  terrain?: Record<string, TerrainCell>;
  /** Ширина фону в клітинках (з повзунка «Розмір клітинки»); без неї фон вписується в cols×rows */
  backgroundCols?: number;
  /** Зсув сітки відносно фону, частки клітинки 0 ≤ v < 1 */
  gridOffset?: { x: number; y: number };
  maze?: MazeConfig | null;
  /** Атмосфера без механіки; відсутня або null — ясно */
  weather?: WeatherKind | null;
}

export type TerrainKind = "wall" | "barrier" | "hazard";

/** type — тип шкоди (fire, cold…) */
export interface TerrainDamage {
  dice?: string;
  amount?: number;
  type: string;
  /** Небезпека від заклинання: імунітет і опори до заклинань діють, як при касті */
  spellId?: string;
}

export interface TerrainCell {
  kind: TerrainKind;
  label?: string;
  /** Барʼєр або небезпека діє до кінця цього раунду */
  untilRound?: number;
  damage?: TerrainDamage;
}

/** зміни місцевості в дельті: однакові значення згруповані, щоб підпис не повторювався на кожній клітинці */
export interface TerrainDiff {
  set?: { cell: TerrainCell; keys: string[] }[];
  removed?: string[];
}

export type BattleMapMark = "move" | "move-danger" | "target" | "invalid-target" | "template";

export interface BattleMapView {
  selectedId?: string | null;
  currentId?: string | null;
  /** cellKey → позначка; число — досяжна клітинка (вартість руху, не показується) */
  marks?: Map<string, BattleMapMark | number>;
  /** Підказка атаки при наведенні: дальня — лінія до клітинки, ближня — меч на цілі */
  trajectory?: { fromId: string; targetId: string; to: GridPoint; kind: "melee" | "ranged" } | null;
  /** Точка наведення шаблону заклинання */
  aim?: GridPoint | null;
  /** Звідки біжить хвиля пульсу превʼю шаблону */
  pulseFrom?: GridPoint | null;
  /** Плашка під токеном: без запису — exact */
  hud?: Map<string, { exact: boolean }>;
  /** Учасник, якому доступне «Повернутися» (удар і повернення) */
  returnId?: string | null;
  /** Клітинки надісланих штрихів місцевості до відповіді сервера */
  pendingStroke?: ReadonlySet<string>;
  /** Поточний раунд — для «ще N р.» на тимчасовій небезпеці */
  round?: number;
  /** Удар останньої дії по учаснику: рамка, спалах і тремтіння токена в момент влучання */
  impactFor?: (participantId: string) => FxImpact | null;
  /** Ефекти для аур на токенах (той самий набір, що й у списку) */
  effects?: ReadonlyMap<string, readonly ActiveEffect[]>;
  /** Що з лабіринту бачить глядач карти; null — не лабіринт */
  maze?: MazeView | null;
}

export interface BattleMapActions {
  onCellClick?: (p: GridPoint) => void;
  onCellHover?: (p: GridPoint | null) => void;
  onTokenClick?: (id: string) => void;
  onStroke?: (cells: GridPoint[]) => void;
  onReturn?: () => void;
}

/**
 * Бойові параметри учасника.
 * На початку бою currentHp = maxHp. Під час бою maxHp може тимчасово знижуватись
 * (наприклад, лікування -10% maxHP на час бою); після завершення бою стан не зберігається.
 */
export interface BattleParticipantCombatStats {
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  speed: number; // швидкість переміщення
  /** Сторона footprint у клітинках (1–3); немає = 1 */
  gridSize?: number;
  morale: number; // від -3 до +3, default 0
  status: CombatStatusType;
  minTargets: number;
  maxTargets: number;
}

/**
 * Дані про заклинання учасника
 */
export interface BattleParticipantSpellcasting {
  spellcastingAbility?: SpellcastingAbility;
  spellSaveDC?: number;
  spellAttackBonus?: number;
  spellSlots: Record<string, { max: number; current: number }>; // "1" до "5"
  knownSpells: string[]; // масив ID заклинань
}

/**
 * Бойові дані учасника
 */
export interface AirborneState {
  landAt?: GridPoint;
  targetId?: string;
  since: number;
  percent: number;
  name: string;
}

export interface BattleParticipantBattleData {
  attacks: BattleAttack[];
  activeEffects: ActiveEffect[];
  equippedArtifacts: EquippedArtifact[];
  artifactSets?: SetProgress[];
  /** Пул додаткових дій: поповнюється ефектом grantAction, а на початку власного ходу скидається до суми actionsPerTurn; споживається при використанні основної дії */
  pendingExtraActions?: number;
  /** Хто прикликав або підняв учасника здібністю */
  summonedBy?: string;
  /** Учасник зараз робить додатковий хід від моралі (наприкінці раунду) */
  extraTurnActive?: boolean;
  /** Учасник у резерві бою: ще не на полі, бачить лише ДМ */
  reserved?: boolean;
  /** Щойно введений з резерву: ходить після поточного, у порядку введення */
  revealPending?: boolean;
  resolvedAbilities: ResolvedAbility[];
  abilityUsage?: Record<string, AbilityUsageCounter>;
  /** Чарм скінчився: сторона й контролер повертаються наприкінці цього ходу */
  charmReturn?: { side: ParticipantSide; controlledBy: string };
  /** Рівень майстерності героя у гілці кожної школи заклинань (groupId → рівень) */
  schoolMastery?: Record<string, "basic" | "advanced" | "expert">;
  /** Раунд, у якому власник востаннє вказав зону кожної аури в області (auraId → раунд), навіть порожню */
  auraZones?: Record<string, number>;
  /** Якір (лівий верхній кут footprint) на карті бою; немає — учасник поза картою */
  position?: GridPoint;
  /** Лабіринт: учасник спить, поки його не розбудять */
  dormant?: boolean;
  facing?: Direction8;
  escaped?: boolean;
  mazeWakeRound?: number;
  /** Клітинок пройдено в поточному ході */
  movementUsed?: number;
  /** Якір на початок поточного ходу (для «Удару і повернення») */
  turnStartPosition?: GridPoint;
  /** Вже поверталася на стартову клітинку цього ходу */
  returnedThisTurn?: boolean;
  /** Злетів «Пікіруванням»: поза картою й поза досяжністю до початку свого наступного ходу */
  airborne?: AirborneState;
  /** Відсічей, уже даних з початку власного ходу; немає = за hasUsedReaction */
  retaliationsUsed?: number;
  /** Раунд, у якому учасник востаннє отримав шкоду від небезпечної клітинки */
  hazardHitRound?: number;
  /** Масштаб шкоди ворога-юніта для рівного бою (старт бою); немає = ×1 */
  damageMultiplier?: number;
  /** Масштаб HP ворога-юніта для рівного бою; лише для показу ДМу */
  hpMultiplier?: number;
}

/**
 * Флаги дій учасника
 */
export interface BattleParticipantActionFlags {
  hasUsedAction: boolean;
  hasUsedBonusAction: boolean;
  hasUsedReaction: boolean;
  hasExtraTurn: boolean;
}

/**
 * Повна структура учасника бою
 */
export interface BattleParticipant {
  basicInfo: BattleParticipantBasicInfo;
  abilities: BattleParticipantAbilities;
  combatStats: BattleParticipantCombatStats;
  spellcasting: BattleParticipantSpellcasting;
  battleData: BattleParticipantBattleData;
  actionFlags: BattleParticipantActionFlags;
}

/**
 * Тип для участі в підготовці бою (при створенні)
 */
export interface BattlePreparationParticipant {
  id: string;
  type: ParticipantSourceTypeValue;
  side: ParticipantSide;
  quantity?: number;
  /** Скільки з quantity (герой — 0 або 1) у резерві */
  reserved?: number;
}

export interface DamageStep {
  label: string;
  side: "attacker" | "target";
  kind: "dice" | "flat" | "percent" | "multiplier" | "immunity";
  value: number;
  after: number;
  icon?: string | null;
}

/**
 * Детальна дія в бою (BattleAction)
 * Кожна дія записується для історії та можливості відміни
 */
export interface BattleAction {
  id: string; // унікальний ідентифікатор
  battleId: string; // ID битви
  round: number; // в якому раунді
  actionIndex: number; // порядковий номер дії (для відміни)
  timestamp: Date; // час виконання
  actorId: string; // ID учасника що виконав дію
  actorName: string; // ім'я актора
  actorSide: ParticipantSide;
  actionType:
    | "attack"
    | "spell"
    | "bonus_action"
    | "ability"
    | "end_turn"
    | "skip_turn"
    | "morale_skip"
    | "retaliation";
  targets: Array<{
    participantId: string;
    participantName: string;
  }>;
  actionDetails: {
    /** Лише в записі про завершення бою: бік союзників виграв чи програв */
    battleResult?: "victory" | "defeat";
    /** Службові записи лабіринту: «op» — зміна лабіринту ДМом, «reshuffle» — перетасовка (у журналі не показується нікому), «spotted» — герой помітив ворога */
    mazeEvent?: "op" | "reshuffle" | "spotted";
    // Для атак:
    weaponName?: string;
    /** Тип атаки: melee / ranged */
    attackKind?: AttackType;
    attackRoll?: number;
    attackBonus?: number;
    totalAttackValue?: number;
    targetAC?: number;
    isHit?: boolean;
    isCritical?: boolean;
    isCriticalFail?: boolean;
    /** Другий d20 (перевага/недолік) і кубик, що пішов у розрахунок */
    secondRoll?: { mode: "advantage" | "disadvantage"; value: number; serverRolled: boolean };
    chosenD20?: number;
    // Для урону:
    damageRolls?: Array<{
      dice: string;
      results: number[];
      total: number;
      damageType: string;
    }>;
    totalDamage?: number;
    damageBreakdown?: string; // детальний опис урону
    damageSteps?: Record<string, DamageStep[]>;
    // Для заклинань:
    spellId?: string;
    spellName?: string;
    spellLevel?: number;
    spellSlotUsed?: number;
    /** Приклик юніта після касту */
    summonedUnitTemplateId?: string;
    summonedParticipantId?: string;
    // Для saving throws:
    savingThrows?: Array<{
      participantId: string;
      ability: string;
      roll: number;
      result: "success" | "fail";
    }>;
    // Для лікування:
    healingRolls?: Array<{
      dice: string;
      results: number[];
      total: number;
    }>;
    totalHealing?: number;
    // Для ефектів:
    appliedEffects?: Array<{
      id: string;
      name: string;
      duration: number;
      type?: "buff" | "debuff" | "condition";
      targetId?: string;
    }>;
    spellDamageType?: string;
    spellTargeting?: string;
    aimCell?: GridPoint;
    hazard?: { label: string; damageType: string; damage: number };
    spellEffectKinds?: string[];
    // Для пасивок:
    triggeredAbilities?: Array<{
      id: string;
      name: string;
    }>;
    // Для модифікаторів:
    appliedModifiers?: Array<{
      type: string;
      value: number;
      source: string;
    }>;
    // Для перевірки моралі:
    d10Roll?: number;
    morale?: number;
    // Для бонусної дії (скіл):
    skillId?: string;
    skillName?: string;
    // Критичний ефект (Natural 20/1):
    criticalEffect?: {
      id: number;
      name: string;
      description: string;
      type: "success" | "fail";
      flavor?: string;
    };
  };
  resultText: string; // текстовий опис для лога
  hpChanges: Array<{
    participantId: string;
    participantName: string;
    oldHp: number;
    newHp: number;
    change: number; // позитивне = урон, негативне = лікування
  }>;
  isCancelled: boolean; // чи була відмінена дія
  cancelledAt?: Date; // коли відмінена
  /** Стан бою перед цією дією (для rollback) */
  stateBefore?: {
    initiativeOrder: BattleParticipant[];
    currentTurnIndex: number;
    currentRound: number;
  };
}

export type AddParticipantData = {
  sourceId: string;
  type: ParticipantSourceTypeValue;
  side: ParticipantSide;
  quantity?: number;
  reserved?: boolean;
  position?: GridPoint;
};
