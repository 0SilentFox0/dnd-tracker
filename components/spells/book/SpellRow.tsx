import { Sparkles } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { spellSchoolColor } from "@/lib/constants/spells";
import { cn } from "@/lib/utils";
import { targetingLabel } from "@/lib/utils/spells/model/labels";
import type { BookSpell } from "@/types/spells";

const SIZES = {
  wide: { row: "h-[84px]", frame: "size-16", icon: "size-[52px]", px: 52 },
  narrow: { row: "h-[72px]", frame: "size-11", icon: "size-[30px]", px: 30 },
};

interface SpellRowExtras {
  formula?: string;
  /** вміння заклинателя розширює ціль заклинання */
  badge?: string;
}

export function SpellRow({ spell, school, wide, picked, extras = {}, onPick }: { spell: BookSpell; school: { name: string; color?: string | null }; wide: boolean; picked: boolean; extras?: SpellRowExtras; onPick: (spell: BookSpell) => void }) {
  const { formula, badge } = extras;

  const size = wide ? SIZES.wide : SIZES.narrow;

  const hints = [spell.resolution?.kind === "save" && "рятівний кидок", spell.targeting && targetingLabel(spell.targeting), spell.cost === "bonusAction" && "бонусна дія"].filter(Boolean).join(" · ");

  return (
    <button type="button" onClick={() => onPick(spell)} className={cn("flex w-full items-center gap-3 border-b border-[#2a2018]/15 text-left", size.row, picked && "-mx-3 w-[calc(100%+1.5rem)] bg-[#9c2a1d]/10 px-3 shadow-[inset_3px_0_0_#9c2a1d]")}>
      <span className={cn("flex shrink-0 items-center justify-center border-2 bg-[#2a2018]/5", size.frame)} style={{ borderColor: spellSchoolColor(school) }}>
        {spell.icon ? <OptimizedImage src={spell.icon} alt="" width={size.px} height={size.px} className={cn("object-contain", size.icon)} /> : <Sparkles className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="hud-sc truncate text-[17px] font-bold">{spell.name}</span>
          {badge && <span data-spell-widening className="shrink-0 border border-[#7a2a1f]/50 bg-[#7a2a1f]/10 px-1.5 text-xs leading-5 text-[#7a2a1f]">{badge}</span>}
        </span>
        <span className="block truncate text-sm italic text-[#6b5a45]">{hints}</span>
      </span>
      {formula && spell.dice ? <span className="w-20 text-right text-[15px] text-[#7a2a1f]">{formula}</span> : null}
    </button>
  );
}
