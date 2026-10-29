import type { z } from "zod";

import type { GroupedSkillPayload } from "./hooks";

import { BattleStatus, type CombatStatusType } from "@/lib/constants/battle";
import { type CampaignRoleValue } from "@/lib/constants/campaigns";
import type {
  abilityActionSchema,
  attackBodySchema,
  auraZoneSchema,
  bonusActionSchema,
  critChoiceSchema,
  mapTerrainSchema,
  mapWeatherSchema,
  mazeActionSchema,
  mazeMarkSchema,
  moraleCheckSchema,
  moveSchema,
  patchParticipantSchema,
  spellSchema,
} from "@/lib/schemas/battles";
import type { PendingCritChoice } from "@/lib/utils/battle/crit-choice/types";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAudioState } from "@/types/audio";
import type { BattleMapConfig, MazeConfig, TerrainDiff } from "@/types/battle";

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
  rules: Ruleset;
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

export type AttackData = z.input<typeof attackBodySchema>;

export type MoraleCheckData = z.infer<typeof moraleCheckSchema>;

export type CritChoiceData = z.infer<typeof critChoiceSchema>;

export type BonusActionData = z.infer<typeof bonusActionSchema>;

export type AuraZoneData = z.infer<typeof auraZoneSchema>;

export type MoveParticipantData = z.infer<typeof moveSchema>;

export type MapTerrainData = z.infer<typeof mapTerrainSchema>;

export interface MapTerrainResponse {
  /** зайняті або поза полем клітинки, які сервер пропустив */
  skipped: string[];
}

export type MazeActionData = z.infer<typeof mazeActionSchema>;

export type MazeMarkData = z.infer<typeof mazeMarkSchema>;

export type MapWeatherData = z.infer<typeof mapWeatherSchema>;

export type AbilityActionData = z.infer<typeof abilityActionSchema>;

export type PatchParticipantData = z.infer<typeof patchParticipantSchema>;

export type SpellCastData = z.input<typeof spellSchema>;

// Skill Trees API


export type CampaignRouteContext = { params: Promise<{ id: string }> };

export type CharacterRouteContext = { params: Promise<{ id: string; characterId: string }> };
