import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { isHostedOnProjectStorage } from "@/lib/supabase/image-storage";

/** External download/upload belongs to the existing avatar UI, outside intent transactions. */
export function assertSafeCharacterAvatar(input: Record<string, unknown>) {
  const avatar = input.avatar;

  if (typeof avatar === "string" && (/^data:/i.test(avatar) || (/^https?:/i.test(avatar) && !isHostedOnProjectStorage(avatar)))) {
    throw new ContentError(API_ERRORS.CHARACTER_AVATAR_EDITOR_ONLY, 422);
  }
}
