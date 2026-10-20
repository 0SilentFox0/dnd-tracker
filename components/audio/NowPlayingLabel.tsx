import { Music } from "lucide-react";

import { cn } from "@/lib/utils";

export function NowPlayingLabel({ title, className }: { title: string; className?: string }) {
  return (
    <>
      <Music className="size-4 shrink-0 text-hud-gold" />
      <span className={cn("truncate", className)} title={title}>
        {title}
      </span>
    </>
  );
}
