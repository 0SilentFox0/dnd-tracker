import type { CSSProperties } from "react";

import type { HpChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { signedDelta } from "@/lib/utils/common/format";

export const hitFlashClass = (change: HpChange | null) => change && (change.delta < 0 ? "animate-[hud-flash-red_.5s]" : "animate-[hud-flash-green_.7s]");

/** Спливна «−N/+N» над портретом; новий `change.id` перезапускає анімацію. */
export function HitFloat({ change, className, style }: { change: HpChange | null; className?: string; style?: CSSProperties }) {
  if (!change) return null;

  return (
    <span
      key={`float:${change.id}`}
      style={style}
      className={cn("hud-sc pointer-events-none absolute z-10 font-extrabold leading-none opacity-0 [text-shadow:0_0_2px_#000,0_0_4px_#000,0_2px_8px_#000] animate-[hud-float_1.5s_ease-out]", change.delta < 0 ? "text-[#ff4433]" : "text-[#66e05a]", className)}
    >
      {signedDelta(change.delta)}
    </span>
  );
}
