"use client";

import { useTranslations } from "next-intl";

import { HUD_SURFACE } from "@/components/hud";
import { SpellBookPages, SpellDetail } from "@/components/spells/book/SpellBookPages";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useSpellBrowser } from "@/lib/hooks/characters";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { BookSpell } from "@/types/spells";

export function ProfileSpellBook({ spells, slots, open, onOpenChange }: { spells: BookSpell[]; slots: { level: number; count: number }[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("characterProfile.spellBook");

  const book = useSpellBrowser(spells, slots);

  const wide = useMediaQuery(DESKTOP_QUERY);

  const showDetail = !!book.selected;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={showDetail && !wide ? t("toList") : t("title")}
      size="lg"
      className={cn(HUD_SURFACE, "max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]")}
    >
      <SpellBookPages
        byLevel={book.byLevel}
        page={{ level: book.level, slotOf: book.slotOf, onLevel: book.setLevel }}
        pick={{ pickedId: book.selected?.id ?? null, onPick: book.pick }}
        layout={{ wide, showDetail }}
        detail={book.selected && <div className="relative flex h-full flex-1 flex-col px-5 pb-5 pt-6"><SpellDetail spell={book.selected} /></div>}
      />
      {showDetail && !wide && (
        <button type="button" onClick={book.back} className="hud-sc mt-2 h-10 w-full text-sm text-hud-bone">
          {t("back")}
        </button>
      )}
    </ResponsiveDialog>
  );
}
