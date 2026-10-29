import type { AssistantActionDef } from "../types";
import { BATTLE_COMMANDS, BATTLE_READS, BATTLE_RECORD_WRITES, battleActionInput, HUMAN_BATTLE_ACTIONS } from "./battle-actions";

import "server-only";
import { getTranslator } from "@/lib/i18n/translator";
import { prepareBattleAction, readBattleAction, runBattleAction } from "@/lib/server/battles/action-service";

/** Registration and legacy transport activation are deliberately deferred to T14. */
const operations: readonly AssistantActionDef[] = [...BATTLE_READS, ...BATTLE_RECORD_WRITES, ...BATTLE_COMMANDS].map((operation): AssistantActionDef => {
  const read = (BATTLE_READS as readonly string[]).includes(operation);

  const base = { id: `battles.${operation}`, title: `Battles: ${operation}`, description: "Current battle rules, permissions, resources and log. Dice: server-rolled or explicit manual values.", input: battleActionInput, need: { access: "dm" as const, scope: read ? "battles:read" as const : "battles:write" as const } };

  if (read) return { ...base, effect: "read", execute: (caller, raw) => readBattleAction(caller.actor, operation, raw, caller.locale) };

  return { ...base, effect: "write", confirmation: HUMAN_BATTLE_ACTIONS.has(operation) ? "always" : "standard", prepare: (caller, raw) => prepareBattleAction(caller, operation, raw), execute: (ctx, raw) => runBattleAction(ctx.caller.actor, operation, raw, ctx.expected, ctx) };
});

export const BATTLE_ACTIONS: readonly AssistantActionDef[] = [...operations, {
  id: "battles.crit-choice", title: "Crit effect choice", description: "An attack or spell stopped on a crit: only the DM picks the effect in the battle dialog while the battle is locked.", input: battleActionInput,
  need: { access: "dm", scope: "battles:write" }, effect: "handoff",
  execute: async (caller, raw) => {
    const { battleId } = battleActionInput.parse(raw);

    return { href: `/campaigns/${caller.actor.campaignId}/dm/battles${battleId ? `/${encodeURIComponent(battleId)}` : ""}`, reason: (await getTranslator(caller.locale, "assistant"))("handoffs.battleCritChoice") };
  },
}, {
  id: "battles.map-background", title: "Upload map background", description: "The existing editor uploads or mirrors the image before the battle is saved.", input: battleActionInput,
  need: { access: "dm", scope: "battles:write" }, effect: "handoff",
  execute: async (caller, raw) => {
    const { battleId } = battleActionInput.parse(raw);

    return { href: `/campaigns/${caller.actor.campaignId}/dm/battles${battleId ? `/${encodeURIComponent(battleId)}` : ""}`, reason: (await getTranslator(caller.locale, "assistant"))("handoffs.battleMapBackground") };
  },
}];
