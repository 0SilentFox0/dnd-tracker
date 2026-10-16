import { spellLevelMetal } from "@/components/hud";
import { spellLevelRoman } from "@/lib/constants/spells";
import { cn } from "@/lib/utils";

const LEVELS = [0, 1, 2, 3, 4, 5] as const;

export function LevelBookmarks({ level, slotOf, onLevel }: { level: number; slotOf: (level: number) => number; onLevel: (level: number) => void }) {
  return (
    <div className="absolute bottom-0 right-1.5 top-6 z-10">
      <div className="sticky top-6 flex flex-col gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={level === l}
            aria-label={`${spellLevelRoman(l)} коло, слотів ${l === 0 ? "∞" : slotOf(l)}`}
            onClick={() => onLevel(l)}
            className={cn("hud-sc flex h-14 flex-col items-center justify-center gap-1 pb-1.5 text-[13px] [clip-path:polygon(0_0,100%_0,100%_100%,50%_86%,0_100%)]", spellLevelMetal(l), "metal-fill", level === l ? "-ml-2 w-10" : "w-8", l > 0 && slotOf(l) === 0 && "opacity-55 grayscale")}
          >
            {spellLevelRoman(l)}
            <span className="font-sans text-[11px] opacity-85">{l === 0 ? "∞" : slotOf(l)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
