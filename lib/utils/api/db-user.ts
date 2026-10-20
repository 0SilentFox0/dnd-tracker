import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { AuthUserResult } from "@/lib/utils/api/api-auth";

export const PUBLIC_USER_SELECT = { id: true, displayName: true, avatar: true } satisfies Prisma.UserSelect;

type AuthUser = AuthUserResult["authUser"];

function profileFromAuth(authUser: AuthUser) {
  const meta = authUser.user_metadata;

  return {
    email: authUser.email || "",
    displayName: meta?.full_name || meta?.name || authUser.email?.split("@")[0] || "User",
    avatar: meta?.avatar_url || meta?.picture || null,
  };
}

/** Creates the DB user row on first sign-in; with `refresh` also syncs email/name/avatar from Supabase Auth. */
export async function ensureDbUser(authUser: AuthUser, { refresh = false }: { refresh?: boolean } = {}): Promise<void> {
  const profile = profileFromAuth(authUser);

  const meta = authUser.user_metadata;

  await prisma.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, ...profile },
    update: refresh
      ? {
          ...(authUser.email && { email: authUser.email }),
          ...((meta?.full_name || meta?.name) && { displayName: meta?.full_name || meta?.name }),
          ...((meta?.avatar_url || meta?.picture) && { avatar: meta?.avatar_url || meta?.picture }),
        }
      : {},
  });
}
