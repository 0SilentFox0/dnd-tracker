"use client";

import { type Dispatch, useState } from "react";

import { TrackPicker } from "./TrackPicker";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { SLIDE_CAPTION_MAX, SLIDE_TITLE_MAX } from "@/lib/constants/show";
import type { DeckDraftAction } from "@/lib/utils/show/deck-draft";
import type { Slide } from "@/types/show";

interface SlideDialogProps {
  campaignId: string;
  slide: { slide: Slide; index: number } | null;
  actions: { dispatch: Dispatch<DeckDraftAction>; close(): void };
}

function SlideForm({ campaignId, slide, actions }: { campaignId: string; slide: Slide; actions: SlideDialogProps["actions"] }) {
  const [title, setTitle] = useState(slide.title ?? "");

  const [caption, setCaption] = useState(slide.caption ?? "");

  const [trackId, setTrackId] = useState(slide.trackId);

  const done = () => {
    actions.dispatch({ type: "update", id: slide.id, patch: { title: title.trim(), caption: caption.trim(), trackId } });
    actions.close();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video w-full overflow-hidden rounded bg-black">
        <OptimizedImage src={slide.imageUrl} alt="" width={640} height={360} className="size-full object-contain" />
      </div>
      <Input aria-label="Заголовок" placeholder="Заголовок" maxLength={SLIDE_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
      <div>
        <Textarea aria-label="Підпис" placeholder="Підпис" maxLength={SLIDE_CAPTION_MAX} value={caption} onChange={(e) => setCaption(e.target.value)} />
        <p className="mt-1 text-right text-xs text-hud-muted">
          {caption.length}/{SLIDE_CAPTION_MAX}
        </p>
      </div>
      <TrackPicker campaignId={campaignId} value={trackId} onChange={setTrackId} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={actions.close}>
          Скасувати
        </Button>
        <Button type="button" onClick={done}>
          Готово
        </Button>
      </div>
    </div>
  );
}

export function SlideDialog({ campaignId, slide, actions }: SlideDialogProps) {
  return (
    <ResponsiveDialog hud open={slide !== null} onOpenChange={(open) => !open && actions.close()} title={slide ? `Слайд ${slide.index + 1}` : "Слайд"}>
      {slide && <SlideForm key={slide.slide.id} campaignId={campaignId} slide={slide.slide} actions={actions} />}
    </ResponsiveDialog>
  );
}
