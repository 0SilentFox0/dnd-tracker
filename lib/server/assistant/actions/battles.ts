import type { AssistantActionDef } from "../types";
import { BATTLE_COMMANDS, BATTLE_READS, BATTLE_RECORD_WRITES, battleActionInput, HUMAN_BATTLE_ACTIONS } from "./battle-actions";

import "server-only";
import { prepareBattleAction, readBattleAction, runBattleAction } from "@/lib/server/battles/action-service";

/** Registration and legacy transport activation are deliberately deferred to T14. */
const operations: readonly AssistantActionDef[] = [...BATTLE_READS, ...BATTLE_RECORD_WRITES, ...BATTLE_COMMANDS].map((operation): AssistantActionDef => {
  const read = (BATTLE_READS as readonly string[]).includes(operation);

  const base = { id: `battles.${operation}`, title: `Бої: ${operation}`, description: "Чинні бойові правила, права, ресурси та журнал. Кидки: server або явно задані manual.", input: battleActionInput, need: { access: "dm" as const, scope: read ? "battles:read" as const : "battles:write" as const } };

  if (read) return { ...base, effect: "read", execute: (caller, raw) => readBattleAction(caller.actor, operation, raw) };

  return { ...base, effect: "write", confirmation: HUMAN_BATTLE_ACTIONS.has(operation) ? "always" : "standard", prepare: (caller, raw) => prepareBattleAction(caller, operation, raw), execute: (ctx, raw) => runBattleAction(ctx.caller.actor, operation, raw, ctx.expected, ctx) };
});

export const BATTLE_ACTIONS: readonly AssistantActionDef[] = [...operations, {
  id: "battles.crit-choice", title: "Вибір ефекту крита", description: "Атака чи закляття зупинились на крит: ефект обирає лише ДМ у діалозі бою, поки бій заблоковано.", input: battleActionInput,
  need: { access: "dm", scope: "battles:write" }, effect: "handoff",
  execute: async (caller, raw) => {
    const { battleId } = battleActionInput.parse(raw);

    return { href: `/campaigns/${caller.actor.campaignId}/dm/battles${battleId ? `/${encodeURIComponent(battleId)}` : ""}`, reason: "ДМ обирає ефект крита, «Випадково» або скасовує дію у діалозі бою; до цього інші команди бою відхиляються." };
  },
}, {
  id: "battles.map-background", title: "Завантажити фон карти", description: "Чинний редактор завантажує або дзеркалить зображення перед збереженням бою.", input: battleActionInput,
  need: { access: "dm", scope: "battles:write" }, effect: "handoff",
  execute: async (caller, raw) => {
    const { battleId } = battleActionInput.parse(raw);

    return { href: `/campaigns/${caller.actor.campaignId}/dm/battles${battleId ? `/${encodeURIComponent(battleId)}` : ""}`, reason: "Додайте зображення у редакторі карти; після збереження можна використовувати його посилання." };
  },
}];
