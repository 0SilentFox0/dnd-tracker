import type { AssistantActionDef } from "../types";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterType } from "@/lib/constants/characters";
import { getTranslator } from "@/lib/i18n/translator";
import { CHARACTER_INPUTS, characterReads, characterState, runCharacterOperation } from "@/lib/server/characters/action-service";
import { assertSafeCharacterAvatar } from "@/lib/server/characters/avatar-input";
import { withCharacterOperation } from "@/lib/server/characters/operation-context";
import { ContentError } from "@/lib/server/content/errors";
import { requestDigest } from "@/lib/utils/battle/store/stable-json";
import { jsonContent } from "@/lib/utils/common/json";

export const CHARACTER_ACTIONS: readonly AssistantActionDef[] = Object.entries(CHARACTER_INPUTS).map(([operation, input]): AssistantActionDef => {
  const read = characterReads.has(operation);

  const base = {
    id: `characters.${operation}`,
    title: `Characters: ${operation}`,
    description: operation.startsWith("tokens.") ? "Character game tokens" : "Current character operations",
    input,
    need: { access: "dm" as const, scope: read ? "characters:read" as const : "characters:write" as const },
  };

  if (read) return { ...base, effect: "read", execute: (caller, raw) => runCharacterOperation(caller.actor, operation, input.parse(raw) as Record<string, unknown>, undefined, caller.locale) };

  return {
    ...base,
    effect: "write",
    confirmation: ["delete", "delete-all", "tokens.delete", "patch", "goals"].includes(operation) ? "always" : "standard",
    prepare: async (caller, raw) => {
      const t = await getTranslator(caller.locale, "assistant");

      const value = input.parse(raw) as Record<string, unknown>;

      assertSafeCharacterAvatar(value);

      return withCharacterOperation(caller.actor.campaignId, operation, value, async () => {
        const state = await characterState(caller.actor, value);

        const rows = operation === "create" ? [] : operation === "delete-all" ? state.characters.filter(row => row.type === CharacterType.PLAYER) : state.characters;

        if (value.characterId && !rows.length) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

        const targets = rows.map(row => ({ domain: "characters", id: row.id, name: row.name }));

        const target = targets[0] ?? { domain: "characters", id: caller.actor.campaignId, name: String(value.name ?? t("results.characters")) };

        if (operation === "create") targets.push(target);

        const before = rows.map(({ notes, ...row }: { notes?: unknown; id: string }) => ({ ...row, notesHash: requestDigest(notes ?? null) }));

        const kind = ["delete", "delete-all", "tokens.delete"].includes(operation) ? "delete"
          : operation === "patch" && value.controlledBy !== undefined ? "change-access"
          : ["create", "tokens.create"].includes(operation) ? "create" : "update";

        return {
          summary: operation === "delete-all" ? t("summary.deleteAllPlayers") : t("summary.characters", { operation }),
          targets,
          changes: [{ target, path: operation, before: jsonContent(before), after: jsonContent(value) }],
          warnings: [],
          preconditions: { fingerprint: requestDigest(state) },
          effects: [{ kind, targets, description: operation }],
        };
      });
    },
    execute: (ctx, raw) => runCharacterOperation(ctx.caller.actor, operation, input.parse(raw) as Record<string, unknown>, (ctx.expected as { fingerprint: string }).fingerprint, ctx.caller.locale),
  };
});
