import { Prisma } from "@prisma/client";

import "server-only";
import { prisma } from "@/lib/db";
import { SHOW_STATE_EVENT, showChannelName } from "@/lib/pusher/channels";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import type { BattleAudioState } from "@/types/audio";
import type { ShowEvent, ShowState, Slide } from "@/types/show";

const SHOW_SELECT = { deckId: true, deckTitle: true, slide: true, nextImageUrl: true, audio: true, seq: true } as const;

type ShowRow = Prisma.CampaignShowGetPayload<{ select: typeof SHOW_SELECT }>;

export function toShowState(row: ShowRow): ShowState {
  return {
    deckId: row.deckId,
    deckTitle: row.deckTitle,
    slide: (row.slide ?? null) as Slide | null,
    nextImageUrl: row.nextImageUrl,
    audio: (row.audio ?? null) as BattleAudioState | null,
    seq: row.seq,
  };
}

export async function readShowState(campaignId: string): Promise<ShowState | null> {
  const row = await prisma.campaignShow.findUnique({ where: { campaignId }, select: SHOW_SELECT });

  return row ? toShowState(row) : null;
}

const json = (v: unknown) => (v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

/** Оптимістичне блокування за seq; рядок створюється лише першим записом і ніколи не видаляється. */
export async function writeShowState(campaignId: string, prev: ShowState | null, next: ShowState): Promise<boolean> {
  const data = { deckId: next.deckId, deckTitle: next.deckTitle, slide: json(next.slide), nextImageUrl: next.nextImageUrl, audio: json(next.audio), seq: next.seq };

  if (!prev) {
    const { count } = await prisma.campaignShow.createMany({ data: [{ campaignId, ...data }], skipDuplicates: true });

    return count === 1;
  }

  const { count } = await prisma.campaignShow.updateMany({ where: { campaignId, seq: prev.seq }, data });

  return count === 1;
}

/** Викликати з after(): Pusher не повинен затримувати відповідь. */
export function publishShow(campaignId: string, show: ShowState): Promise<void> {
  const event: ShowEvent = { campaignId, show };

  return safePusherTrigger(pusherServer, showChannelName(campaignId), SHOW_STATE_EVENT, event, { action: "show state" });
}
