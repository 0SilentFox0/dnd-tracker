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
      className={cn(HUD_SURFACE, "spellbook-dialog max-w-[980px] border-none p-2.5 shadow-2xl")}
    >
      <SpellBookPages
        byLevel={book.byLevel}
        page={{ level: book.level, slotOf: book.slotOf, onLevel: book.setLevel }}
        pick={{ pickedId: book.selected?.id ?? null, onPick: book.pick }}
        layout={{ wide, showDetail }}
        detail={book.selected && <div className="relative flex h-full flex-1 flex-col px-5 pb-5 pt-6"><SpellDetail spell={book.selected} /></div>}
      />
      {showDetail && !wide && (
        <button type="button" onClick={book.back} className="spell-book spell-book-accent hud-sc mt-2 h-10 w-full text-sm">
          {t("back")}
        </button>
      )}
    </ResponsiveDialog>
  );
}
