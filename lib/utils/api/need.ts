import { type ApiTokenScope, hasScope } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import type { AccessLevel, ActorNeed } from "@/lib/utils/api/actor";

export const NEED = {
  read: (access: AccessLevel): ActorNeed => ({ access, scope: "content:read" }),
  write: { access: "dm", scope: "content:write" } as ActorNeed,
  writeAll: { access: "dm", scope: "content:write", sessionOnly: true } as ActorNeed,
};

export function needFailure(actor: { isDM: boolean; via: "session" | "token"; scopes: readonly ApiTokenScope[] | null }, need: ActorNeed): string | null {
  if (need.access === "dm" && !actor.isDM) return API_ERRORS.FORBIDDEN;

  if (need.sessionOnly && actor.via === "token") return API_ERRORS.API_TOKEN_SESSION_ONLY;

  if (actor.scopes && !hasScope(actor.scopes, need.scope)) return API_ERRORS.API_TOKEN_SCOPE_MISSING;

  return null;
}
