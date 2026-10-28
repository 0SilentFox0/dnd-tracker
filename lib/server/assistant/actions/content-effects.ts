import { z } from "zod";

import type { EffectHandlers } from "../effects";
import type { ActionExecutionContext } from "../types";

import "server-only";
import { invalidateReference, ReferenceKind, type ReferenceKindValue } from "@/lib/cache/tags";
import { ContentError } from "@/lib/server/content/errors";
import { currentContentWrite } from "@/lib/server/content/write-context";
import { removeTrackFile, trackObjectPath, trackPathOwnedBy } from "@/lib/supabase/battle-music-storage";

export const CONTENT_EFFECT_HANDLERS: EffectHandlers = {
  invalidate: async (payload) => {
    const { campaignId, kinds } = z.object({ campaignId: z.string().min(1), kinds: z.array(z.enum(Object.values(ReferenceKind))) }).parse(payload);

    invalidateReference(kinds, campaignId);
  },
  "media-cleanup": async (payload) => {
    const { campaignId, url } = z.object({ campaignId: z.string().min(1), url: z.string().url() }).parse(payload);

    const path = trackObjectPath(url);

    if (!path || !trackPathOwnedBy(path, campaignId)) throw new ContentError("Некоректний об’єкт очищення", 403);

    await removeTrackFile(url, { strict: true });
  },
};

export async function withContentEffects<T>(ctx: ActionExecutionContext, kinds: readonly ReferenceKindValue[], work: () => Promise<T>): Promise<T> {
  const current = currentContentWrite();

  if (!current || current.campaignId !== ctx.caller.actor.campaignId) throw new ContentError("Відсутній контекст запису", 500);

  const previous = current.onTrackFileRemoved;

  current.onTrackFileRemoved = (url) => ctx.afterCommit({ key: `${ctx.intentId}:track-file`, kind: "media-cleanup", payload: { campaignId: current.campaignId, url } });
  try {
    const result = await work();

    if (kinds.length) ctx.afterCommit({ key: `${ctx.intentId}:content`, kind: "invalidate", payload: { campaignId: current.campaignId, kinds: [...kinds] } });

    return result;
  } finally { current.onTrackFileRemoved = previous; }
}
