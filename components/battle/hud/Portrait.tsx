import Image from "next/image";

import { ParticipantSide } from "@/lib/constants/battle";
import { cn } from "@/lib/utils";
import { isDown } from "@/lib/utils/battle/participant/state";
import type { BattleParticipant } from "@/types/battle";

export function Portrait({ participant, size = 40, current, me, extra, className }: {
  participant: BattleParticipant;
  size?: number;
  current?: boolean;
  me?: boolean;
  extra?: boolean;
  className?: string;
}) {
  const { avatar, name, side } = participant.basicInfo;

  const down = isDown(participant);

  const ring = side === ParticipantSide.ALLY ? "var(--ally)" : "var(--enemy)";

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#241d16] text-xs font-bold", down && "grayscale brightness-50", className)}
      style={{
        width: size,
        height: size,
        boxShadow: current
          ? `0 0 0 2px var(--bone), 0 0 0 4px ${ring}`
          : me
            ? `0 0 0 2px ${ring}, 0 0 0 3px #000, 0 0 0 5px var(--gold)`
            : extra
              ? `0 0 0 2px var(--gold), 0 0 0 3px #000`
              : `0 0 0 2px ${ring}, 0 0 0 3px #000`,
      }}
    >
      {avatar ? <Image src={avatar} alt={name} fill sizes={`${size}px`} className="object-cover" /> : name.slice(0, 2)}
      {extra && <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-[var(--gold)] text-[10px] leading-none text-black">+</span>}
    </span>
  );
}
