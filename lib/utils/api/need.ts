import type { AccessLevel, ActorNeed } from "@/lib/utils/api/actor";

export const NEED = {
  read: (access: AccessLevel): ActorNeed => ({ access, scope: "content:read" }),
  write: { access: "dm", scope: "content:write" } as ActorNeed,
  writeAll: { access: "dm", scope: "content:write", sessionOnly: true } as ActorNeed,
};
