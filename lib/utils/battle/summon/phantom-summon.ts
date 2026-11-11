import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { dropConcentration } from "@/lib/utils/battle/concentration";
import { nearestStandable } from "@/lib/utils/battle/grid/occupancy";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

interface PhantomInput {
  source: BattleParticipant;
  owner: BattleParticipant;
  order: BattleParticipant[];
  castId: string;
  map?: BattleMapConfig | null;
}

export function buildPhantom({ source, owner, order, castId, map }: PhantomInput): BattleParticipant {
  const copy = structuredClone(source);

  const id = `phantom:${castId}:${order.filter((p) => p.basicInfo.id.startsWith(`phantom:${castId}:`)).length + 1}`;

  const { instanceId: _instanceId, instanceNumber: _instanceNumber, ...basic } = copy.basicInfo;

  void _instanceId;
  void _instanceNumber;

  const { deathSaves: _deathSaves, transform: _transform, pendingCast: _pendingCast, object: _object, charmReturn: _charmReturn, abilityUsage: _abilityUsage, pools: _pools, position: _position, ...data } = copy.battleData;

  void [_deathSaves, _transform, _pendingCast, _object, _charmReturn, _abilityUsage, _pools, _position];

  const base: BattleParticipant = {
    ...copy,
    basicInfo: { ...basic, id, sourceId: `phantom:${castId}`, sourceType: ParticipantSourceType.UNIT, name: `👻 ${source.basicInfo.name}`, side: owner.basicInfo.side, controlledBy: owner.basicInfo.controlledBy },
    combatStats: { ...copy.combatStats, maxHp: 1, currentHp: 1, tempHp: 0, status: CombatStatus.ACTIVE },
    battleData: { ...data, activeEffects: [], abilityUsage: {}, summonedBy: owner.basicInfo.id, phantomOf: owner.basicInfo.id, pendingExtraActions: 0 },
    actionFlags: { hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false, hasExtraTurn: false },
  };

  const at = map && source.battleData.position ? nearestStandable(map, order, base, source.battleData.position) : null;

  return at ? { ...base, battleData: { ...base.battleData, position: at } } : base;
}

const isPhantomOf = (p: BattleParticipant, ownerId: string) =>
  p.battleData.phantomOf === ownerId || (p.basicInfo.id.startsWith("phantom:") && p.battleData.summonedBy === ownerId);

/** `keepCastId`: фантоми цього касту лишаються (мультицільовий каст = кілька запитів одного власника). */
export function dismissPhantoms(order: BattleParticipant[], ownerId: string, keepCastId?: string): { order: BattleParticipant[]; messages: LogLine[] } {
  const messages: LogLine[] = [];

  const dismissedIds: string[] = [];

  let next = order.map((p) => {
    if (!isPhantomOf(p, ownerId) || !isActive(p) || (keepCastId && p.basicInfo.sourceId === `phantom:${keepCastId}`)) return p;

    const { position: _position, ...battleData } = p.battleData;

    messages.push(textRef("battleLog.summon.phantomReplaced", { name: p.basicInfo.name }));
    dismissedIds.push(p.basicInfo.id);

    return { ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD }, battleData: { ...battleData, dismissed: true } };
  });

  if (!messages.length) return { order, messages };

  for (const id of dismissedIds) {
    const dropped = dropConcentration(next, id, "");

    next = dropped.participants;
    messages.push(...dropped.messages);
  }

  return { order: next, messages };
}
