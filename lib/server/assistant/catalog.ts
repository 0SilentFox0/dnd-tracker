import type { AssistantActionDef } from "./types";

import "server-only";
import { ContentError } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";
import { needFailure } from "@/lib/utils/api/need";

export function createActionCatalog(definitions: readonly AssistantActionDef[]) {
  const actions = new Map<string, AssistantActionDef>();

  for (const def of definitions) {
    if (!/^[a-z][a-z-]*(?:\.[a-z][a-z-]*)+$/.test(def.id) || actions.has(def.id)) throw new ContentError("Некоректний або повторний id дії", 500);

    actions.set(def.id, def);
  }

  return {
    getAction(id: string): AssistantActionDef {
      const action = actions.get(id);

      if (!action) throw new ContentError("Дія асистента недоступна", 404);

      return action;
    },
    listActions(actor: Actor): AssistantActionDef[] {
      if (!actor.isDM || (actor.via === "token" && !actor.scopes)) return [];

      // sessionOnly restricts execution, not preparing a proposal for session review.
      return [...actions.values()].filter((def) => !needFailure(actor, { ...def.need, sessionOnly: undefined }));
    },
  };
}

// Domain adapters are connected only after the guarded executor is ready.
const catalog = createActionCatalog([]);

export const getAction = catalog.getAction;
