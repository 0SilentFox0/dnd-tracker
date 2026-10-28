import { requestDigest } from "../intent-store";
import type { AssistantActionDef } from "../types";

import "server-only";
import { CharacterType } from "@/lib/constants/characters";
import { CHARACTER_INPUTS, characterReads, characterResult, characterState, runCharacterOperation } from "@/lib/server/characters/action-service";
import { assertSafeCharacterAvatar } from "@/lib/server/characters/avatar-input";
import { withCharacterOperation } from "@/lib/server/characters/operation-context";
import { ContentError } from "@/lib/server/content/errors";

export const CHARACTER_ACTIONS: readonly AssistantActionDef[] = Object.entries(CHARACTER_INPUTS).map(([operation, input]): AssistantActionDef => {
  const read = characterReads.has(operation);

  const base = {
    id: `characters.${operation}`,
    title: `Персонажі: ${operation}`,
    description: operation.startsWith("tokens.") ? "Ігрові жетони персонажа" : "Чинні операції персонажів",
    input,
    need: { access: "dm" as const, scope: read ? "characters:read" as const : "characters:write" as const },
  };

  if (read) return { ...base, effect: "read", execute: (caller, raw) => runCharacterOperation(caller.actor, operation, input.parse(raw) as Record<string, unknown>) };

  return {
    ...base,
    effect: "write",
    confirmation: ["delete", "delete-all", "tokens.delete", "patch", "goals"].includes(operation) ? "always" : "standard",
    prepare: (caller, raw) => {
      const value = input.parse(raw) as Record<string, unknown>;

      assertSafeCharacterAvatar(value);

      return withCharacterOperation(caller.actor.campaignId, operation, value, async () => {
        const state = await characterState(caller.actor, value);

        const rows = operation === "create" ? [] : operation === "delete-all" ? state.characters.filter(row => row.type === CharacterType.PLAYER) : state.characters;

        if (value.characterId && !rows.length) throw new ContentError("Персонажа не знайдено", 404);

        const targets = rows.map(row => ({ domain: "characters", id: row.id, name: row.name }));

        const target = targets[0] ?? { domain: "characters", id: caller.actor.campaignId, name: String(value.name ?? "Персонажі") };

        if (operation === "create") targets.push(target);

        const before = rows.map(({ notes, ...row }) => ({ ...row, notesHash: requestDigest(notes ?? null) }));

        const kind = ["delete", "delete-all", "tokens.delete"].includes(operation) ? "delete"
          : operation === "patch" && value.controlledBy !== undefined ? "change-access"
          : ["create", "tokens.create"].includes(operation) ? "create" : "update";

        return {
          summary: operation === "delete-all" ? "Видалити всіх персонажів типу «Гравець»" : `Персонажі: ${operation}`,
          targets,
          changes: [{ target, path: operation, before: characterResult(before, target.id).data, after: characterResult(value, target.id).data }],
          warnings: [],
          preconditions: { fingerprint: requestDigest(state) },
          effects: [{ kind, targets, description: operation }],
        };
      });
    },
    execute: (ctx, raw) => runCharacterOperation(ctx.caller.actor, operation, input.parse(raw) as Record<string, unknown>, (ctx.expected as { fingerprint: string }).fingerprint),
  };
});
