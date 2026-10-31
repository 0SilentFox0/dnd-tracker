import { useTranslations } from "next-intl";

import { SpellIcon } from "@/components/spells/SpellIcon";
import { spellSchoolColor } from "@/lib/constants/spells";
import { useSpellLabels } from "@/lib/hooks/spells";
import { cn } from "@/lib/utils";
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
  const t = useTranslations("spells.book");

  const labels = useSpellLabels();

  const { formula, badge } = extras;

  const size = wide ? SIZES.wide : SIZES.narrow;

  const hints = [spell.resolution?.kind === "save" && t("hintSave"), spell.targeting && labels.targeting(spell.targeting), spell.cost === "bonusAction" && labels.cost("bonusAction")].filter(Boolean).join(" · ");

  return (
    <button type="button" onClick={() => onPick(spell)} className={cn("spell-book-border flex w-full items-center gap-3 border-b text-left", size.row, picked && "spell-book-choice -mx-3 w-[calc(100%+1.5rem)] px-3")}>
      <span className={cn("spell-book-border flex shrink-0 items-center justify-center border-2 bg-[color-mix(in_srgb,var(--book-ink,#2a2018)_5%,transparent)]", size.frame)} style={{ borderColor: spellSchoolColor(school) }}>
        <SpellIcon spell={{ icon: spell.icon, spellGroup: spell.spellGroup ?? null }} size={size.px} className={cn("object-contain", size.icon)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="hud-sc truncate text-[17px] font-bold">{spell.name}</span>
          {badge && <span data-spell-widening className="spell-book-widening shrink-0 border px-1.5 text-xs leading-5">{badge}</span>}
        </span>
        <span className="spell-book-quiet block truncate text-sm italic">{hints}</span>
      </span>
      {formula && spell.dice ? <span className="spell-book-accent w-20 text-right text-[15px]">{formula}</span> : null}
    </button>
  );
}
