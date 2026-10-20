"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_SLIDES_PER_DECK, SLIDE_FILE_ACCEPT } from "@/lib/constants/show";
import { useNotify } from "@/lib/hooks/common";
import type { useDeckEditor } from "@/lib/hooks/show";
import { isHttpUrl } from "@/lib/utils/common/image-url";

export function AddSlidesBar({ upload, count }: { upload: ReturnType<typeof useDeckEditor>["upload"]; count: number }) {
  const notify = useNotify();

  const fileInput = useRef<HTMLInputElement>(null);

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

            if (files.length < picked.length) void notify(`Додано ${files.length} з ${picked.length}: у наборі максимум ${MAX_SLIDES_PER_DECK} слайдів`);

            if (files.length) void upload.addFiles(files);
          }}
        />
        <Button type="button" variant="outline" disabled={disabled} onClick={() => fileInput.current?.click()} className="flex items-center gap-2">
          <ImagePlus className="size-4" />
          Додати картинки
        </Button>
        <Input aria-label="Посилання на картинку" placeholder="Посилання на картинку" value={url} disabled={disabled} onChange={(e) => setUrl(e.target.value)} className="sm:flex-1" />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !isHttpUrl(url)}
          onClick={() => {
            upload.addUrl(url);
            setUrl("");
          }}
        >
          Додати
        </Button>
      </div>
      {full && <p className="text-xs text-hud-muted">Максимум {MAX_SLIDES_PER_DECK} слайдів</p>}
      {upload.progress && (
        <p className="text-xs text-hud-muted">
          Завантаження {upload.progress.done} з {upload.progress.total}
        </p>
      )}
    </div>
  );
}
