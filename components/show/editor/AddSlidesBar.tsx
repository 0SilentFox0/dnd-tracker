"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Puzzle, Sparkles } from "lucide-react";

import { GenerateSlideDialog } from "./GenerateSlideDialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_SLIDES_PER_DECK, SLIDE_FILE_ACCEPT } from "@/lib/constants/show";
import { useNotify } from "@/lib/hooks/common";
import { type useDeckEditor, useGenerateSlide } from "@/lib/hooks/show";
import { isHttpUrl } from "@/lib/utils/common/image-url";

export function AddSlidesBar({ campaignId, upload, count }: { campaignId: string; upload: ReturnType<typeof useDeckEditor>["upload"]; count: number }) {
  const t = useTranslations("show");

  const tc = useTranslations("common");

  const notify = useNotify();

  const { providers } = useGenerateSlide(campaignId);

  const [generating, setGenerating] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  const puzzleInput = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");

  const full = count >= MAX_SLIDES_PER_DECK;

  const disabled = full || upload.progress !== null;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept={SLIDE_FILE_ACCEPT}
          onChange={(e) => {
            const picked = [...(e.target.files ?? [])];

            e.target.value = "";

            const files = picked.slice(0, Math.max(MAX_SLIDES_PER_DECK - count, 0));

            if (files.length < picked.length) void notify(t("addSlides.partial", { added: files.length, picked: picked.length, max: MAX_SLIDES_PER_DECK }));

            if (files.length) void upload.addFiles(files);
          }}
        />
        <input
          ref={puzzleInput}
          type="file"
          hidden
          accept={SLIDE_FILE_ACCEPT}
          onChange={(e) => {
            const file = e.target.files?.[0];

            e.target.value = "";

            if (file) upload.addPuzzle(file).catch(() => void notify(t("puzzle.addFailed", { name: file.name })));
          }}
        />
        <Button type="button" variant="outline" disabled={disabled} onClick={() => fileInput.current?.click()} className="flex items-center gap-2">
          <ImagePlus className="size-4" />
          {t("addSlides.images")}
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => puzzleInput.current?.click()} className="flex items-center gap-2">
          <Puzzle className="size-4" />
          {t("addSlides.puzzle")}
        </Button>
        <Input aria-label={t("addSlides.urlLabel")} placeholder={t("addSlides.urlLabel")} value={url} disabled={disabled} onChange={(e) => setUrl(e.target.value)} className="sm:flex-1" />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !isHttpUrl(url)}
          onClick={() => {
            upload.addUrl(url);
            setUrl("");
          }}
        >
          {tc("actions.add")}
        </Button>
        {providers.length > 0 && (
          <Button type="button" variant="outline" disabled={disabled} onClick={() => setGenerating(true)} className="flex items-center gap-2">
            <Sparkles className="size-4" />
            {t("addSlides.generate")}
          </Button>
        )}
      </div>
      <GenerateSlideDialog campaignId={campaignId} open={generating} onOpenChange={setGenerating} onAdd={upload.addUrl} />
      {full && <p className="text-xs text-hud-muted">{t("addSlides.max", { max: MAX_SLIDES_PER_DECK })}</p>}
      {upload.progress && (
        <p className="text-xs text-hud-muted">
          {t("addSlides.progress", { done: upload.progress.done, total: upload.progress.total })}
        </p>
      )}
    </div>
  );
}
