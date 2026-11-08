import { ParticipantSide } from "@/lib/constants/battle";
import type { QueueEntry } from "@/lib/utils/battle/view/queue";
import type { ActiveEffect, BattleAction, BattleParticipant, IllusionDisguise } from "@/types/battle";
import type { LogLine, TextArg } from "@/types/text";

const NO_NAMES: ReadonlyMap<string, string> = new Map();

export type DisguiseOf = (targetId: string) => IllusionDisguise | undefined;

/** Замаскований партнер для глядача — ворог: інакше ростер, кільце портрета й точні стати видають союзника */
export const maskParticipant = (p: BattleParticipant, d: IllusionDisguise): BattleParticipant => ({
  ...p,
  basicInfo: { ...p.basicInfo, name: d.name, avatar: d.avatar, side: ParticipantSide.ENEMY },
});

/** Ефект, накладений замаскованим партнером, показує маску, а не справжнє ім'я джерела */
const maskEffects = <E extends ActiveEffect>(effects: readonly E[], disguiseOf: DisguiseOf, names: ReadonlyMap<string, string> = NO_NAMES): readonly E[] => {
  const masked = effects.map((e) => {
    const { source } = e;

    if (!source) return e;

    const name = disguiseOf(source.participantId)?.name ?? maskPlain(source.name, names);

    const abilityName = source.abilityName && maskPlain(source.abilityName, names);

    return name === source.name && abilityName === source.abilityName ? e : { ...e, source: { ...source, name, ...(abilityName && { abilityName }) } };
  });

  return masked.some((e, i) => e !== effects[i]) ? masked : effects;
};

export const maskParticipantBy = (p: BattleParticipant, disguiseOf: DisguiseOf, names?: ReadonlyMap<string, string>): BattleParticipant => {
  const d = disguiseOf(p.basicInfo.id);

  const own = p.battleData.activeEffects;

  const effects = own && maskEffects(own, disguiseOf, names);

  const base = effects && effects !== own ? { ...p, battleData: { ...p.battleData, activeEffects: effects as ActiveEffect[] } } : p;

  return d ? maskParticipant(base, d) : base;
};

export const maskEffectMap = (map: ReadonlyMap<string, ActiveEffect[]>, disguiseOf: DisguiseOf, names?: ReadonlyMap<string, string>): Map<string, ActiveEffect[]> =>
  new Map([...map].map(([id, list]) => [id, maskEffects(list, disguiseOf, names) as ActiveEffect[]]));

export const maskQueueBy = (queue: QueueEntry[], disguiseOf: DisguiseOf, names?: ReadonlyMap<string, string>): QueueEntry[] =>
  queue.map((e) => (e.kind === "round" ? e : { ...e, participant: maskParticipantBy(e.participant, disguiseOf, names) }));

function maskArg(arg: TextArg, names: ReadonlyMap<string, string>): TextArg {
  if (typeof arg === "string") return maskPlain(arg, names);

  if (typeof arg === "number") return arg;

  return { ...arg, ...(arg.params && { params: Object.fromEntries(Object.entries(arg.params).map(([k, v]) => [k, maskArg(v, names)])) }) };
}

const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const regexCache = new WeakMap<ReadonlyMap<string, string>, RegExp | null>();

const namesRegex = (names: ReadonlyMap<string, string>): RegExp | null => {
  if (regexCache.has(names)) return regexCache.get(names) ?? null;

  const keys = [...names.keys()].filter(Boolean).sort((a, b) => b.length - a.length);

  const re = keys.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${keys.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "gu") : null;

  regexCache.set(names, re);

  return re;
};

/** Імена як окремі токени (не частина довшого слова); один прохід, довші першими — маска не підміняється вдруге */
const maskPlain = (text: string, names: ReadonlyMap<string, string>): string => {
  const re = namesRegex(names);

  return re ? text.replace(re, (m) => names.get(m) ?? m) : text;
};

/** Імена в params (рекурсивно) міняються на маску; рядки без TextRef лишаються як є */
const maskLogLine = (line: LogLine, names: ReadonlyMap<string, string>): LogLine => {
  if (names.size === 0) return line;

  return typeof line === "string" ? maskPlain(line, names) : (maskArg(line, names) as LogLine);
};

/** `viewerNames` — справжнє ім'я → маска для всіх записів (системні/DM-події без цілей теж згадують партнера) */
export function maskAction(e: BattleAction, disguiseOf: DisguiseOf, viewerNames: ReadonlyMap<string, string> = NO_NAMES): BattleAction {
  let names = viewerNames; // copied on first rename so the shared viewer map is never mutated

  const rename = (id: string, current: string) => {
    const d = disguiseOf(id);

    if (!d) return current;

    if (names === viewerNames) names = new Map(viewerNames);

    (names as Map<string, string>).set(current, d.name);

    return d.name;
  };

  const actorName = rename(e.actorId, e.actorName);

  const targets = (e.targets ?? []).map((t) => ({ ...t, participantName: rename(t.participantId, t.participantName) }));

  const hpChanges = (e.hpChanges ?? []).map((h) => ({ ...h, participantName: rename(h.participantId, h.participantName) }));

  if (names.size === 0) return e;

  return { ...e, actorName, targets, hpChanges, resultText: typeof e.resultText === "string" ? maskPlain(e.resultText, names) : e.resultText, ...(e.log && { log: e.log.map((l) => maskLogLine(l, names)) }) };
}

/** Імперативне читання кешу (readBattle) теж віддає імена під маскою */
export const maskBattleBy = <T extends { initiativeOrder: BattleParticipant[]; battleLog?: BattleAction[] }>(battle: T, disguiseOf: DisguiseOf, viewerNames?: ReadonlyMap<string, string>): T => ({
  ...battle,
  initiativeOrder: battle.initiativeOrder.map((p) => maskParticipantBy(p, disguiseOf, viewerNames)),
  ...(battle.battleLog && { battleLog: battle.battleLog.map((e) => maskAction(e, disguiseOf, viewerNames)) }),
});
