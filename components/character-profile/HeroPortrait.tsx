"use client";

import { useState } from "react";

import { ImageZoomDialog } from "@/components/common/ImageZoomDialog";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { cn } from "@/lib/utils";

interface HeroPortraitProps {
  src: string | null | undefined;
  name: string;
  className?: string;
  canEdit?: boolean;
}

export function HeroPortrait({ src, name, className, canEdit }: HeroPortraitProps) {
  const [open, setOpen] = useState(false);

  const frame = cn("relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-hud-gold bg-[#2a2016]", className);

  if (!src) {
    return (
      <div className={cn(frame, "hud-sc flex h-48 flex-col items-center justify-center gap-1 text-6xl text-hud-gold lg:aspect-[3/4] lg:h-auto")}>
        {name.trim().charAt(0).toUpperCase() || "?"}
        {canEdit && <span className="text-xs text-hud-muted">Додати фото</span>}
      </div>
    );
  }

  return (
    <>
      <button type="button" aria-label="Відкрити фото" onClick={() => setOpen(true)} className={frame}>
        <OptimizedImage src={src} alt={name} width={640} height={853} className="size-full object-cover" />
      </button>
      <ImageZoomDialog src={src} name={name} open={open} onOpenChange={setOpen} />
    </>
  );
}
