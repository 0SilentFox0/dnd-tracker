import type { ReactNode } from "react";
import Image from "next/image";

import { SHOWCASE_MEDIA } from "@/components/landing/media";
import { cn } from "@/lib/utils";

const FRAME =
  "overflow-hidden rounded-xl border border-hud-line bg-[#0e0b09] shadow-[0_30px_70px_-20px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.15)] transition duration-500 hover:shadow-[0_30px_70px_-20px_rgba(0,0,0,.95),0_0_0_1px_rgba(201,179,122,.4),0_0_60px_-20px_rgba(230,194,90,.35)]";

export function MediaFrame({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn(FRAME, className)}>
      <div className="flex items-center gap-2 border-b border-hud-rule bg-[#15110d] px-3 py-1.5">
        <span className="flex gap-1" aria-hidden>
          <span className="size-2 rounded-full bg-[#5a3a2a]" />
          <span className="size-2 rounded-full bg-[#5a4a2a]" />
          <span className="size-2 rounded-full bg-[#3a4a2a]" />
        </span>
        <span className="hud-sc truncate text-xs text-hud-bone">{title}</span>
      </div>
      {children}
    </div>
  );
}

interface ScreenProps {
  id: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

// a missing screenshot degrades to a styled placeholder, never to a broken image
export function Screen({ id, alt, priority, sizes = "(min-width: 1152px) 550px, (min-width: 1024px) 45vw, 100vw", className }: ScreenProps) {
  const media = SHOWCASE_MEDIA[id];

  const ratio = media?.ratio === "9/16" ? "aspect-[9/16]" : "aspect-[16/10]";

  if (!media?.image) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("grid place-items-center bg-[radial-gradient(ellipse_at_50%_30%,rgba(230,194,90,.14),transparent_65%),#120e0b]", ratio, className)}
      >
        <span aria-hidden className="size-10 rotate-45 rounded-sm border border-hud-gold/40" />
      </div>
    );
  }

  return (
    <div className={cn("relative", ratio, className)}>
      <Image src={media.image} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
    </div>
  );
}
