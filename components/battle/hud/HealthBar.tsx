import { ParticipantSide } from "@/lib/constants/battle";
import { cn } from "@/lib/utils";
import { HEALTH_LABEL, healthSegments, healthState, hpRatio } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

export function HealthBar({ participant, exact, className }: { participant: BattleParticipant; exact: boolean; className?: string }) {
  if (exact) {
    const ratio = hpRatio(participant);

    const low = ratio <= 0.25;

    return (
      <div className={cn("mt-1.5 h-1 bg-white/10", className)}>
        <i className={cn("block h-full transition-[width] duration-500", participant.basicInfo.side === ParticipantSide.ALLY ? (low ? "bg-[#c0392b]" : "bg-[#5f8a5a]") : "bg-[var(--enemy)]")} style={{ width: `${ratio * 100}%` }} />
      </div>
    );
  }

  const state = healthState(participant);

  const filled = healthSegments(state);

  return (
    <div className={cn("mt-1.5", className)}>
      <span className="sr-only">{HEALTH_LABEL[state]}</span>
      <div aria-hidden className="grid h-1 grid-cols-4 gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={cn("block", i < filled ? (state === "unhurt" ? "bg-[var(--enemy)]/60" : "bg-[#c0392b]") : "bg-white/10", state === "dying" && i < filled && "animate-[hud-pulse_1.4s_infinite]")} />
        ))}
      </div>
    </div>
  );
}

export function HealthLabel({ participant }: { participant: BattleParticipant }) {
  const state = healthState(participant);

  return <span className={cn("ml-2 text-[13px] italic", state === "unhurt" ? "text-[var(--hud-muted)]" : "text-[#c98a7c]")}>{HEALTH_LABEL[state]}</span>;
}
