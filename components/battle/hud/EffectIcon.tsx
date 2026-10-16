"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useParticipantFace } from "@/lib/hooks/battle";
import type { ActiveEffect } from "@/types/battle";

/** Персональне вміння — портрет героя-джерела; інакше іконка ефекту, без неї — портрет того, хто наклав, далі іскра. */
export function EffectIcon({ effect, size }: { effect: ActiveEffect; size: number }) {
  const icon = effect.icon ?? effect.source?.icon;

  const face = useParticipantFace(effect.source?.participantId);

  if (face && (effect.source?.personal || !icon)) {
    return (
      <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-current bg-black/40 text-[9px] font-bold" style={{ width: size, height: size }}>
        {face.avatar ? <Image src={face.avatar} alt={face.name} fill sizes={`${size}px`} className="object-cover" /> : face.name.slice(0, 2)}
      </span>
    );
  }

  const inner = Math.round(size * 0.7);

  return (
    <span className="flex shrink-0 items-center justify-center border border-current bg-black/40" style={{ width: size, height: size }}>
      {icon ? <OptimizedImage src={icon} alt="" width={inner} height={inner} className="size-[70%] object-contain" /> : <Sparkles className="size-[70%]" />}
    </span>
  );
}
