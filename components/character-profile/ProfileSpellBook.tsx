"use client";

import { SpellBookPages, SpellDetail } from "@/components/battle/wizards/SpellBookPages";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useSpellBrowser } from "@/lib/hooks/characters";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { BookSpell } from "@/types/spells";

export function ProfileSpellBook({ spells, slots, open, onOpenChange }: { spells: BookSpell[]; slots: { level: number; count: number }[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const book = useSpellBrowser(spells, slots);

  const wide = useMediaQuery("(min-width: 1024px)");

  const showDetail = !!book.selected;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={showDetail && !wide ? "← До списку" : "Книга заклинань"}
      size="lg"
      className={cn(HUD_SURFACE, "max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]")}
    >
      <SpellBookPages
        byLevel={book.byLevel}
        slotOf={book.slotOf}
        level={book.level}
        pickedId={book.selected?.id ?? null}
        wide={wide}
        showDetail={showDetail}
        onLevel={book.setLevel}
        onPick={book.pick}
        detail={book.selected && <div className="relative flex h-full flex-col px-5 pb-5 pt-6"><SpellDetail spell={book.selected} /></div>}
      />
      {showDetail && !wide && (
        <button type="button" onClick={book.back} className="hud-sc mt-2 h-10 w-full text-sm text-hud-bone">
          ← Назад
        </button>
      )}
    </ResponsiveDialog>
  );
}
