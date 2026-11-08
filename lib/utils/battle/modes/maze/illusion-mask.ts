import type { QueueEntry } from "@/lib/utils/battle/view/queue";
import type { BattleAction, BattleParticipant, IllusionDisguise } from "@/types/battle";
import type { LogLine, TextArg } from "@/types/text";

export type DisguiseOf = (targetId: string) => IllusionDisguise | undefined;

export const maskParticipant = (p: BattleParticipant, d: IllusionDisguise): BattleParticipant => ({ ...p, basicInfo: { ...p.basicInfo, name: d.name, avatar: d.avatar } });

export const maskParticipantBy = (p: BattleParticipant, disguiseOf: DisguiseOf): BattleParticipant => {
  const d = disguiseOf(p.basicInfo.id);

  return d ? maskParticipant(p, d) : p;
};

export const maskQueueBy = (queue: QueueEntry[], disguiseOf: DisguiseOf): QueueEntry[] =>
  queue.map((e) => (e.kind === "round" ? e : { ...e, participant: maskParticipantBy(e.participant, disguiseOf) }));

function maskArg(arg: TextArg, names: ReadonlyMap<string, string>): TextArg {
  if (typeof arg === "string") return names.get(arg) ?? arg;

  if (typeof arg === "number") return arg;

  return { ...arg, ...(arg.params && { params: Object.fromEntries(Object.entries(arg.params).map(([k, v]) => [k, maskArg(v, names)])) }) };
}

/** Імена в params (рекурсивно) міняються на маску; рядки без TextRef лишаються як є */
export const maskLogLine = (line: LogLine, names: ReadonlyMap<string, string>): LogLine => (typeof line === "string" || names.size === 0 ? line : (maskArg(line, names) as LogLine));

export function maskAction(e: BattleAction, disguiseOf: DisguiseOf): BattleAction {
  const names = new Map<string, string>();

  const rename = (id: string, current: string) => {
    const d = disguiseOf(id);

    if (!d) return current;

    names.set(current, d.name);

    return d.name;
  };

  const actorName = rename(e.actorId, e.actorName);

  const targets = (e.targets ?? []).map((t) => ({ ...t, participantName: rename(t.participantId, t.participantName) }));

  const hpChanges = (e.hpChanges ?? []).map((h) => ({ ...h, participantName: rename(h.participantId, h.participantName) }));

  if (names.size === 0) return e;

  return { ...e, actorName, targets, hpChanges, ...(e.log && { log: e.log.map((l) => maskLogLine(l, names)) }) };
}

/** Імперативне читання кешу (readBattle) теж віддає імена під маскою */
export const maskBattleBy = <T extends { initiativeOrder: BattleParticipant[]; battleLog?: BattleAction[] }>(battle: T, disguiseOf: DisguiseOf): T => ({
  ...battle,
  initiativeOrder: battle.initiativeOrder.map((p) => maskParticipantBy(p, disguiseOf)),
  ...(battle.battleLog && { battleLog: battle.battleLog.map((e) => maskAction(e, disguiseOf)) }),
});
