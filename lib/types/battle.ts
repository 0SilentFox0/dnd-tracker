/**
 * Типи для боїв
 */

export interface BattleLogEntry {
  round: number;
  timestamp: string;
  actorName: string;
  action: string;
  target?: string;
  result: string;
  damage?: number;
  healing?: number;
}

export interface InitiativeParticipant {
  participantId: string;
  participantType: "character" | "unit";
  instanceId?: string;
  initiative: number;
  name: string;
  avatar?: string;
  side: "ally" | "enemy";
  currentHp: number;
  maxHp: number;
  tempHp: number;
  status: "active" | "dead" | "unconscious";
  activeEffects: Array<{
    name: string;
    type: "buff" | "debuff" | "condition";
    duration: number;
    effect: Record<string, unknown>;
    description?: string;
  }>;
}

export interface BattleParticipant {
  id: string;
  type: "character" | "unit";
  side: "ally" | "enemy";
  quantity?: number;
}
