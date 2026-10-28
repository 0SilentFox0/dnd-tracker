import { Prisma } from "@prisma/client";

import "server-only";
import { prisma } from "@/lib/db";
import { SHOW_STATE_EVENT, showChannelName } from "@/lib/pusher/channels";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import { withoutBattle, withoutWorldTargets } from "@/lib/utils/show/show-command";
import type { BattleAudioState } from "@/types/audio";
import type { PuzzleState, ShowBattle, ShowCover, ShowEvent, ShowState, ShowWorld, Slide } from "@/types/show";

const SHOW_SELECT = { deckId: true, deckTitle: true, slide: true, nextImageUrl: true, audio: true, battle: true, cover: true, curtain: true, world: true, seq: true } as const;

type ShowRow = Prisma.CampaignShowGetPayload<{ select: typeof SHOW_SELECT }>;

type StoredSlide = Slide & { puzzleState?: PuzzleState };

/** Стан пазла лежить усередині JSONB слайда під `puzzleState` (`puzzle` слайда — це параметри нарізки). */
function splitSlide(raw: unknown): { slide: Slide | null; puzzle?: PuzzleState } {
  if (!raw) return { slide: null };

  const { puzzleState, ...slide } = raw as StoredSlide;

  return { slide, ...(puzzleState ? { puzzle: puzzleState } : {}) };
}

export function toShowState(row: ShowRow): ShowState {
  const { slide, puzzle } = splitSlide(row.slide);

  return {
    deckId: row.deckId,
    deckTitle: row.deckTitle,
    slide,
    nextImageUrl: row.nextImageUrl,
    audio: (row.audio ?? null) as BattleAudioState | null,
    ...(row.battle ? { battle: row.battle as unknown as ShowBattle } : {}),
    ...(row.cover ? { cover: row.cover as unknown as ShowCover } : {}),
    ...(row.curtain ? { curtain: true as const } : {}),
    ...(row.world ? { world: row.world as unknown as ShowWorld } : {}),
    ...(puzzle ? { puzzle } : {}),
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
  const data = { deckId: next.deckId, deckTitle: next.deckTitle, slide: json(next.slide && next.puzzle ? { ...next.slide, puzzleState: next.puzzle } : next.slide), nextImageUrl: next.nextImageUrl, audio: json(next.audio), battle: json(next.battle ?? null), cover: json(next.cover ?? null), curtain: !!next.curtain, world: json(next.world ?? null), seq: next.seq };

  if (!prev) {
    const { count } = await prisma.campaignShow.createMany({ data: [{ campaignId, ...data }], skipDuplicates: true });

    return count === 1;
  }

  const { count } = await prisma.campaignShow.updateMany({ where: { campaignId, seq: prev.seq }, data });

  return count === 1;
}

/** Викликати з after(): Pusher не повинен затримувати відповідь. */
export function publishShow(campaignId: string, show: ShowState, options: { strict?: boolean } = {}): Promise<void> {
  const event: ShowEvent = { campaignId, show };

  if (options.strict) return pusherServer.trigger(showChannelName(campaignId), SHOW_STATE_EVENT, event).then(() => undefined);

  return safePusherTrigger(pusherServer, showChannelName(campaignId), SHOW_STATE_EVENT, event, { action: "show state" });
}

const CLEAR_ATTEMPTS = 3;

/** Бій завершено — виклик «До бою!» для нього знімається; помилки лише логуються. */
export async function clearShowBattle(campaignId: string, battleId: string, options: { strict?: boolean } = {}): Promise<void> {
  try {
    for (let attempt = 0; attempt < CLEAR_ATTEMPTS; attempt++) {
      const show = await readShowState(campaignId);

      const next = withoutBattle(show, battleId);

      if (!show) return;

      if (!next) { if (options.strict) await publishShow(campaignId, show, options);

 return; }

      if (await writeShowState(campaignId, show, next)) {
        await publishShow(campaignId, next, options);

        return;
      }
    }

    if (options.strict) throw new Error("Show update conflict");
  } catch (error) {
    if (options.strict) throw error;

    console.error("[show] clear battle call failed", error);
  }
}

/** Показану карту чи фокус-маркер видалено — показ їх більше не згадує; помилки лише логуються. */
export async function clearShowWorld(campaignId: string, gone: { mapIds: string[]; markerIds: string[] }): Promise<void> {
  try {
    for (let attempt = 0; attempt < CLEAR_ATTEMPTS; attempt++) {
      const show = await readShowState(campaignId);

      const next = withoutWorldTargets(show, gone);

      if (!show || !next) return;

      if (await writeShowState(campaignId, show, next)) {
        await publishShow(campaignId, next);

        return;
      }
    }
  } catch (error) {
    console.error("[show] clear world failed", error);
  }
}
