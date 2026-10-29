"use client";

import { type Dispatch, useState } from "react";
import { useTranslations } from "next-intl";

import { PuzzlePreview } from "./PuzzlePreview";
import { TrackPicker } from "./TrackPicker";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { PUZZLE_MAX_PIECES, PUZZLE_MIN_PIECES, SLIDE_CAPTION_MAX, SLIDE_TITLE_MAX } from "@/lib/constants/show";
import { randomPuzzleSeed } from "@/lib/utils/puzzle/generate";
import type { DeckDraftAction } from "@/lib/utils/show/deck-draft";
import type { PuzzleCut, Slide } from "@/types/show";

interface SlideDialogProps {
  campaignId: string;
  slide: { slide: Slide; index: number } | null;
  actions: { dispatch: Dispatch<DeckDraftAction>; close(): void };
}

const CUTS: PuzzleCut[] = ["classic", "organic", "straight"];

function SlideForm({ campaignId, slide, actions }: { campaignId: string; slide: Slide; actions: SlideDialogProps["actions"] }) {
  const t = useTranslations("show");

  const tc = useTranslations("common");

  const [title, setTitle] = useState(slide.title ?? "");

  const [caption, setCaption] = useState(slide.caption ?? "");

  const [trackId, setTrackId] = useState(slide.trackId);

  const [puzzle, setPuzzle] = useState(slide.puzzle);

  const done = () => {
    actions.dispatch({ type: "update", id: slide.id, patch: { title: title.trim(), caption: caption.trim(), trackId, puzzle } });
    actions.close();
  };

  return (
    <div className="flex flex-col gap-3">
      {puzzle ? (
        <>
          <PuzzlePreview spec={puzzle} imageUrl={slide.imageUrl} />
          <div className="flex flex-wrap items-center gap-2">
            {CUTS.map((cut) => (
              <Button key={cut} type="button" size="sm" variant={puzzle.cut === cut ? "default" : "outline"} aria-pressed={puzzle.cut === cut} onClick={() => setPuzzle({ ...puzzle, cut })}>
                {t(`slideDialog.cuts.${cut}`)}
              </Button>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setPuzzle({ ...puzzle, seed: randomPuzzleSeed() })}>
              {t("slideDialog.shuffle")}
            </Button>
          </div>
          <label className="flex items-center gap-3 text-sm text-hud-bone">
            {t("slideDialog.pieces", { count: puzzle.count })}
            <input
              type="range"
              aria-label={t("slideDialog.piecesLabel")}
              min={PUZZLE_MIN_PIECES}
              max={PUZZLE_MAX_PIECES}
              value={puzzle.count}
              onChange={(e) => setPuzzle({ ...puzzle, count: Number(e.target.value) })}
              className="flex-1"
            />
          </label>
        </>
      ) : (
        <div className="aspect-video w-full overflow-hidden rounded bg-black">
          <OptimizedImage src={slide.imageUrl} alt="" width={640} height={360} className="size-full object-contain" />
        </div>
      )}
      <Input aria-label={t("slideDialog.title")} placeholder={t("slideDialog.title")} maxLength={SLIDE_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div>
        <Textarea aria-label={t("slideDialog.caption")} placeholder={t("slideDialog.caption")} maxLength={SLIDE_CAPTION_MAX} value={caption} onChange={(e) => setCaption(e.target.value)} />
        <p className="mt-1 text-right text-xs text-hud-muted">
          {caption.length}/{SLIDE_CAPTION_MAX}
        </p>
      </div>
      <TrackPicker campaignId={campaignId} value={trackId} onChange={setTrackId} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={actions.close}>
          {tc("actions.cancel")}
        </Button>
        <Button type="button" onClick={done}>
          {t("slideDialog.done")}
        </Button>
      </div>
    </div>
  );
}

export function SlideDialog({ campaignId, slide, actions }: SlideDialogProps) {
  const t = useTranslations("show");

  return (
    <ResponsiveDialog hud open={slide !== null} onOpenChange={(open) => !open && actions.close()} title={slide ? t("slide", { index: slide.index + 1 }) : t("slideBare")}>
      {slide && <SlideForm key={slide.slide.id} campaignId={campaignId} slide={slide.slide} actions={actions} />}
    </ResponsiveDialog>
  );
}
