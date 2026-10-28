import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { loadAudioLibrary } from "@/lib/server/audio/track-store";
import { ContentError } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { loadShowDeck } from "@/lib/server/show/deck-store";
import { writeShowState } from "@/lib/server/show/show-store";
import { applyShowCommand, showNeedsLibrary } from "@/lib/utils/show/show-command";
import type { ShowCommand, ShowState } from "@/types/show";

/** One command resolver/CAS for native HTTP and guarded actor execution. No publication in tx. */
export async function applyAndWriteShowCommand(campaignId: string, prev: ShowState | null, cmd: ShowCommand): Promise<ShowState> {
  return withCampaignContentWrite(campaignId, async () => {
  const deckId = cmd.action === "open" || cmd.action === "setCover" ? cmd.deckId : cmd.action === "next" || cmd.action === "prev" ? prev?.deckId : null;

  const deck = deckId ? await loadShowDeck(campaignId, deckId) : null;

  const battle = cmd.action === "battle" ? await prisma.battleScene.findFirst({ where: { id: cmd.battleId, campaignId }, select: { id: true, name: true, status: true } }) : null;

  if (cmd.action === "battle" && !battle) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

  const library = showNeedsLibrary(prev, cmd, deck) ? await loadAudioLibrary(campaignId) : [];

  const result = applyShowCommand(prev, cmd, { now: Date.now(), deck, library, battle });

  if (!result.ok) throw new ContentError(result.message, 422);

  if (result.value !== prev && !(await writeShowState(campaignId, prev, result.value))) throw new ContentError(API_ERRORS.SHOW_CONFLICT, 409);

  return result.value;
  });
}
