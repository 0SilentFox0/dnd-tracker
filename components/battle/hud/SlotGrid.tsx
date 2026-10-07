
import { spellLevelMetal } from "@/components/hud";
import { spellLevelRoman } from "@/lib/constants/spells";
import { cn } from "@/lib/utils";
import { slotLevels } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

export function SlotGrid({ participant }: { participant: BattleParticipant }) {
  return (
    <div className="mt-3 grid h-10 grid-cols-5 border border-white/15">
      {slotLevels(participant).map(({ level, max, current }) => (
        <div key={level} aria-label={`${spellLevelRoman(level)} коло: ${current} з ${max}`} className={cn("flex flex-col items-center justify-center gap-1 border-l border-white/15 first:border-l-0", spellLevelMetal(level))}>
          <span className={cn("hud-sc text-xs leading-3", max === 0 ? "text-white/25" : "text-[var(--m2)]")}>{spellLevelRoman(level)}</span>
          <span className="flex h-2 gap-1">
            {Array.from({ length: max }, (_, i) => (
              <i key={i} className={cn("block size-[7px] rotate-45", i < current ? "metal-fill" : "shadow-[inset_0_0_0_1px_#5a5246]")} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
