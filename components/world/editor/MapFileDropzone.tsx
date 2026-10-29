"use client";

import { type DragEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus } from "lucide-react";

import { WORLD_MAP_MAX_EDGE_PX } from "@/lib/constants/world";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

const isImage = (f: File) => ACCEPT.split(",").includes(f.type);

export function MapFileDropzone({ file, onFile }: { file: File | null; onFile(f: File | null): void }) {
  const t = useTranslations("world.dropzone");

  const [over, setOver] = useState(false);

  const [rejected, setRejected] = useState(false);

  const [preview, setPreview] = useState<string | null>(null);

  const urlRef = useRef<string | null>(null);

  useEffect(() => () => void (urlRef.current && URL.revokeObjectURL(urlRef.current)), []);

  const accept = (f: File | undefined) => {
    if (!f) return;

    setRejected(!isImage(f));

    if (!isImage(f)) return;

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);

    urlRef.current = typeof URL.createObjectURL === "function" ? URL.createObjectURL(f) : null;
    setPreview(urlRef.current);
    onFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    accept(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-1">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed p-3 text-center text-sm text-hud-muted transition-colors hover:border-[var(--gold)]",
          over ? "border-[var(--gold)] bg-white/5" : "border-hud-line bg-black/30",
        )}
      >
        <input type="file" accept={ACCEPT} aria-label={t("ariaLabel")} className="sr-only" onChange={(e) => accept(e.target.files?.[0])} />
        {file && preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-40 rounded object-contain" />
        ) : (
          <ImagePlus className="size-7 text-hud-gold" aria-hidden />
        )}
        <span className="text-hud-ink">{file ? file.name : t("prompt")}</span>
        <span className="text-xs">{t("formats", { px: WORLD_MAP_MAX_EDGE_PX })}</span>
      </label>
      {rejected ? <p className="text-xs text-destructive">{t("rejected")}</p> : null}
    </div>
  );
}
