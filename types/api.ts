import type { z } from "zod";

import type { GroupedSkillPayload } from "./hooks";

import { BattleStatus, type CombatStatusType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import { type CampaignRoleValue } from "@/lib/constants/campaigns";
import type { mazeActionSchema, mazeMarkSchema } from "@/lib/schemas/battles";
import type { PendingCritChoice } from "@/lib/utils/battle/crit-choice/types";
import type { BattleAudioState } from "@/types/audio";
import type { BattleMapConfig, GridPoint, MazeConfig, TerrainDiff, TerrainKind, WeatherKind } from "@/types/battle";

// Skills API
export type SkillPayload = GroupedSkillPayload;

export interface SkillUpdatePayload {
  basicInfo?: {
    name?: string;
    description?: string;
    icon?: string | null;
    races?: string[];
    isRacial?: boolean;
  };
  spellData?: {
    spellId?: string | null;
    spellGroupId?: string | null;
  };
  mainSkillData?: {
    mainSkillId?: string | null;
  };
}

// Battles API
import type { BattleAction,BattleParticipant, BattlePreparationParticipant } from "./battle";

import type { MapModeKey } from "@/lib/utils/battle/modes";
import type { BattleKnowledge } from "@/lib/utils/battle/view/knowledge";

export interface BattleScene {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  status: BattleStatus;
  participants: BattlePreparationParticipant[];
  currentRound: number;
  currentTurnIndex: number;
  initiativeOrder: BattleParticipant[];
  /** Призвані істоти (з’являться на початку наступного раунду) */
  pendingSummons?: BattleParticipant[];
  battleLog: BattleAction[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  campaign?: {
    id: string;
    friendlyFire: boolean;
  };
  userRole?: CampaignRoleValue;
  isDM?: boolean;
  version?: number;
  /** Журнал у цій відповіді — лише нові записи, які треба доклеїти до кешу */
  battleLogMode?: "append";
  /** Записи з actionIndex ≥ цього значення скасовано відкатом */
  battleLogCancelledFrom?: number;
  pendingMoraleCheck?: unknown;
  pendingCritChoice?: PendingCritChoice | null;
  map?: BattleMapConfig | null;
  /** Стан музики бою; оновлюється окремо від версії (Pusher battle-audio) */
  audio?: BattleAudioState | null;
  /** Підсумок знань про ціль з усіх атак бою (не лише з останніх записів журналу); лише для гравців */
  knowledge?: BattleKnowledge;
}

export type BattleParticipantPatch = { id: string } & {
  [K in keyof BattleParticipant]?: Partial<BattleParticipant[K]>;
};

export interface ClientBattleDelta {
  battleId: string;
  version: number;
  scene: {
    status: BattleScene["status"];
    round: number;
    turnIndex: number;
    pendingMoraleCheck: unknown;
    pendingCritChoice: PendingCritChoice | null;
    /** null — дату скинуто (reset, відкат завершеного бою) */
    startedAt?: string | null;
    completedAt?: string | null;
    /** лише коли змінилось щось, крім місцевості */
    map?: BattleMapConfig | null;
    /** зміни місцевості, коли решта карти та сама */
    terrain?: TerrainDiff;
    /** змінені поля лабіринту без стін, коли стіни й решта карти ті самі */
    maze?: Partial<Omit<MazeConfig, "walls">>;
  } & Partial<Record<Exclude<MapModeKey, "maze">, unknown>>;
  upserted: BattleParticipant[];
  patched?: BattleParticipantPatch[];
  removed: string[];
  order?: string[];
  pending?: BattleParticipant[];
  setup?: BattlePreparationParticipant[];
  log: BattleAction[];
  cancelledFrom?: number;
  /** зведення знань після відкату: вікно журналу клієнта не бачить подій за його межами */
  knowledge?: BattleKnowledge;
}

export interface BattleEventsPage {
  events: BattleAction[];
  hasMore: boolean;
}

export interface BattleSummaryHero {
  participantId: string;
  name: string;
  avatar?: string;
  damageDealt: number;
  healingDone: number;
  kills: number;
  damageTaken: number;
  status: CombatStatusType;
}

export interface BattleSummary {
  outcome: "victory" | "defeat" | null;
  rounds: number;
  heroes: BattleSummaryHero[];
}

export interface BattleVersion {
  version: number;
}

export interface BattleRefetchSignal {
  battleId: string;
  version: number;
  refetch: true;
}

export interface BattleMutationResponse<R = Record<string, unknown>> {
  delta: ClientBattleDelta;
  response?: R;
}

export interface AttackData {
  attackerId: string;
  attackerType?: ParticipantSourceTypeValue;
  targetId?: string;
  targetIds?: string[];
  targetType?: ParticipantSourceTypeValue;
  attackRoll?: number;
  /** Один кидок на ціль (multi-target); якщо передано, використовується замість attackRoll */
  attackRolls?: number[];
  /** Другий d20 на ціль (multi-target), у тому ж порядку, що й attackRolls; сервер сам вирішує перевагу/недолік */
  secondRolls?: (number | null)[];
  advantageRoll?: number;
  disadvantageRoll?: number;
  /** Вибір гравця «Перевага/Недолік»; сервер застосовує, лише коли навички не задають режим */
  rollMode?: "normal" | "advantage" | "disadvantage";
  damageRolls: number[];
  attackId?: string;
}

export interface MoraleCheckData {
  participantId: string;
  d10Roll: number;
}

export interface BonusActionData {
  participantId: string;
  abilityKey: string;
  targetCell?: GridPoint;
  targetParticipantId?: string;
  targetParticipantIds?: string[];
}

export interface AuraZoneData {
  participantId: string;
  auraId: string;
  targetIds: string[];
}

export interface MoveParticipantData {
  participantId: string;
  to: GridPoint;
  free?: boolean;
  returnToStart?: true;
}

export interface MapTerrainData {
  /** ключі "x:y" */
  cells: string[];
  /** null — стерти */
  terrain: { kind: TerrainKind; label?: string; rounds?: number; damage?: { dice: string; type: string } } | null;
}

export interface MapTerrainResponse {
  /** зайняті або поза полем клітинки, які сервер пропустив */
  skipped: string[];
}

export type MazeActionData = z.infer<typeof mazeActionSchema>;

export type MazeMarkData = z.infer<typeof mazeMarkSchema>;

export interface MapWeatherData {
  /** null — ясно */
  weather: WeatherKind | null;
}

export interface AbilityActionData {
  participantId: string;
  abilityKey: string;
  targetCell?: GridPoint;
  targetParticipantIds?: string[];
}

export interface SpellCastData {
  casterId: string;
  spellId: string;
  targetIds: string[];
  /** точка шаблону на карті */
  targetCell?: GridPoint;
  diceRolls: number[];
  saveRolls?: Array<{ participantId: string; roll: number }>;
  free?: boolean;
}

// Skill Trees API


export type CampaignRouteContext = { params: Promise<{ id: string }> };

export type CharacterRouteContext = { params: Promise<{ id: string; characterId: string }> };
