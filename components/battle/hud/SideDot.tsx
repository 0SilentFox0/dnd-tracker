import { ParticipantSide } from "@/lib/constants/battle";
import { cn } from "@/lib/utils";

export function SideDot({ side, className }: { side: ParticipantSide; className?: string }) {
  return <i aria-hidden className={cn("size-2 shrink-0 rounded-full", className)} style={{ background: side === ParticipantSide.ALLY ? "var(--ally)" : "var(--enemy)" }} />;
}
