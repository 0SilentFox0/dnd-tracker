import { useTranslations } from "next-intl";

import { spellLevelMetal } from "@/components/hud";
import { spellLevelRoman } from "@/lib/constants/spells";
import { cn } from "@/lib/utils";
import { pactSlot, slotLevels } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const COLS: Record<number, string> = { 5: "grid-cols-5", 6: "grid-cols-6", 7: "grid-cols-7", 8: "grid-cols-8", 9: "grid-cols-9" };

export function SlotGrid({ participant }: { participant: BattleParticipant }) {
  const t = useTranslations("battle.hud.slots");

  const levels = slotLevels(participant);

  const pact = pactSlot(participant);

  return (
    <div className="mt-3">
      <div className={cn("grid h-10 border border-white/15", COLS[levels.length])}>
        {levels.map(({ level, max, current }) => (
          <div key={level} aria-label={t("level", { level: spellLevelRoman(level), current, max })} className={cn("flex flex-col items-center justify-center gap-1 border-l border-white/15 first:border-l-0", spellLevelMetal(level))}>
            <span className={cn("hud-sc text-xs leading-3", max === 0 ? "text-white/25" : "text-[var(--m2)]")}>{spellLevelRoman(level)}</span>
            <span className="flex h-2 gap-1">
              {Array.from({ length: max }, (_, i) => (
                <i key={i} className={cn("block size-[7px] rotate-45", i < current ? "metal-fill" : "shadow-[inset_0_0_0_1px_#5a5246]")} />
              ))}
            </span>
          </div>
        ))}
      </div>
      {pact && (
        <div aria-label={t("pactLevel", { level: spellLevelRoman(pact.level), current: pact.current, max: pact.max })} className={cn("mt-1 flex h-6 items-center gap-2 border border-white/15 px-2", spellLevelMetal(pact.level))}>
          <span className="hud-sc text-xs text-[var(--m2)]">{t("pact", { level: pact.level })}</span>
          <span className="flex gap-1">
            {Array.from({ length: pact.max }, (_, i) => (
              <i key={i} className={cn("block size-[7px] rotate-45", i < pact.current ? "metal-fill" : "shadow-[inset_0_0_0_1px_#5a5246]")} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
