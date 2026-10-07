import type { BattleParticipantPatch, BattleScene, ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

function mergeLog(previous: BattleAction[], incoming: BattleAction[], cancelledFrom?: number): BattleAction[] {
  const incomingIds = new Set(incoming.map((e) => e.actionIndex));

  const kept = previous.filter(
    (e) => !incomingIds.has(e.actionIndex) && (cancelledFrom === undefined || e.actionIndex < cancelledFrom),
  );

  return [...kept, ...incoming];
}

function mergeSection<T extends object>(current: T, patch: Partial<T> | undefined): T {
  return patch ? { ...current, ...patch } : current;
}

function mergeParticipantPatch(current: BattleParticipant, patch: BattleParticipantPatch): BattleParticipant {
  return {
    basicInfo: mergeSection(current.basicInfo, patch.basicInfo),
    abilities: mergeSection(current.abilities, patch.abilities),
    combatStats: mergeSection(current.combatStats, patch.combatStats),
    spellcasting: mergeSection(current.spellcasting, patch.spellcasting),
    battleData: mergeSection(current.battleData, patch.battleData),
    actionFlags: mergeSection(current.actionFlags, patch.actionFlags),
  };
}

export function applyBattleDelta(cached: BattleScene, delta: ClientBattleDelta): BattleScene | "refetch" {
  if (cached.version !== undefined && delta.version <= cached.version) return cached;

  if (cached.version === undefined || delta.version !== cached.version + 1) return "refetch";

  const byId = new Map<string, BattleParticipant>(cached.initiativeOrder.map((p) => [p.basicInfo.id, p]));

  for (const p of delta.upserted) byId.set(p.basicInfo.id, p);

  for (const patch of delta.patched ?? []) {
    const current = byId.get(patch.id);

    if (!current) return "refetch";

    byId.set(patch.id, mergeParticipantPatch(current, patch));
  }

  for (const id of delta.removed) byId.delete(id);

  const order = delta.order ?? cached.initiativeOrder.map((p) => p.basicInfo.id).filter((id) => byId.has(id));

  const initiativeOrder = order.map((id) => byId.get(id)).filter((p): p is BattleParticipant => p !== undefined);

  const { scene } = delta;

  // знання з GET могло спиратися на скасовані події: відкат приносить перераховане
  const { knowledge: _knowledge, ...withoutKnowledge } = cached;

  return {
    ...(delta.cancelledFrom === undefined ? cached : withoutKnowledge),
    ...(delta.knowledge && { knowledge: delta.knowledge }),
    version: delta.version,
    status: scene.status,
    currentRound: scene.round,
    currentTurnIndex: scene.turnIndex,
    pendingMoraleCheck: scene.pendingMoraleCheck,
    startedAt: scene.startedAt === null ? undefined : (scene.startedAt ?? cached.startedAt),
    completedAt: scene.completedAt === null ? undefined : (scene.completedAt ?? cached.completedAt),
    initiativeOrder,
    pendingSummons: delta.pending ?? cached.pendingSummons,
    participants: delta.setup ?? (scene.status === "prepared" ? cached.participants : []),
    battleLog: mergeLog(cached.battleLog ?? [], delta.log, delta.cancelledFrom),
    battleLogMode: undefined,
    battleLogCancelledFrom: undefined,
  };
}

export function prependBattleLog(cached: BattleScene, earlier: BattleAction[]): BattleScene {
  return { ...cached, battleLog: mergeLog(earlier, cached.battleLog ?? []) };
}

export function acceptFullBattle(cached: BattleScene | undefined, incoming: BattleScene): BattleScene {
  if (cached?.version !== undefined && incoming.version !== undefined && incoming.version < cached.version) return cached;

  const incomingLog = incoming.battleLog ?? [];

  const windowStart = Math.min(...incomingLog.map((e) => e.actionIndex));

  const cachedLog = cached?.startedAt === incoming.startedAt ? (cached?.battleLog ?? []) : [];

  // seq монотонні й після відкату, тож сусідство не доводить відсутність скасованої дірки — потрібне перекриття з вікном
  const overlaps = cachedLog.some((e) => e.actionIndex === windowStart);

  const older = overlaps ? cachedLog.filter((e) => e.actionIndex < windowStart && !e.isCancelled) : [];

  return {
    ...incoming,
    battleLog: [...older, ...incomingLog],
    isDM: incoming.isDM ?? cached?.isDM,
    userRole: incoming.userRole ?? cached?.userRole,
    campaign: incoming.campaign ?? cached?.campaign,
  };
}
