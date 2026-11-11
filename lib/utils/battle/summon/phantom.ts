import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { nearestStandable } from "@/lib/utils/battle/grid/occupancy";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

const idPrefix = (ownerId: string) => `phantom:${ownerId}:`;

/** The caster's previous live phantom dissolves (no position, dead + dismissed); only one at a time. */
export function dismissPhantoms(order: BattleParticipant[], ownerId: string): { order: BattleParticipant[]; messages: LogLine[] } {
  const messages: LogLine[] = [];

  const next = order.map((p) => {
    if (p.battleData.phantomOf !== ownerId || !isActive(p)) return p;

    const { position: _position, ...battleData } = p.battleData;

    messages.push(textRef("battleLog.summon.phantomReplaced", { name: p.basicInfo.name }));

    return { ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD }, battleData: { ...battleData, dismissed: true } };
  });

  return { order: messages.length ? next : order, messages };
}

/** Full copy of the source (stats, attacks, abilities, resources) at 1 HP, on the owner's side and under their control; clean of effects, death state and pending actions. */
export function buildPhantom(source: BattleParticipant, owner: BattleParticipant, order: BattleParticipant[], map?: BattleMapConfig | null): BattleParticipant {
  const ownerId = owner.basicInfo.id;

  const number = order.filter((p) => p.basicInfo.id.startsWith(idPrefix(ownerId))).length + 1;

  const { position: _position, deathSaves: _deathSaves, transform: _transform, pendingCast: _pendingCast, readied: _readied, charmReturn: _charmReturn, ...battleData } = source.battleData;

  const base: BattleParticipant = {
    ...source,
    basicInfo: { ...source.basicInfo, id: `${idPrefix(ownerId)}${number}`, sourceType: ParticipantSourceType.UNIT, sourceId: `phantom:${source.basicInfo.sourceId}`, instanceNumber: undefined, instanceId: undefined, side: owner.basicInfo.side, controlledBy: owner.basicInfo.controlledBy, xp: 0 },
    combatStats: { ...source.combatStats, currentHp: 1, maxHp: 1, tempHp: 0, status: CombatStatus.ACTIVE },
    actionFlags: { hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false, hasExtraTurn: false },
    battleData: { ...battleData, activeEffects: [], summonedBy: ownerId, phantomOf: ownerId },
  };

  const from = owner.battleData.position;

  const at = map && from ? nearestStandable(map, order, base, from) : null;

  return at ? { ...base, battleData: { ...base.battleData, position: at } } : base;
}
