"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";

import { signed } from "./format";
import { useProfile } from "./ProfileContext";
import { ProfileSpellBook } from "./ProfileSpellBook";
import { Section } from "./Section";

import { metalClass } from "@/components/battle/hud";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROMAN, spellTier } from "@/lib/utils/battle/view";
import { pluralUk } from "@/lib/utils/plural";

export function MagicTab() {
  const { sheet } = useProfile();

  const [open, setOpen] = useState(false);

  if (!sheet.magic && sheet.slots.length === 0 && sheet.spells.length === 0) {
    return <EmptyState title="Магії поки немає" className="border-[#3a2e22] py-6 text-[#8f8473]" />;
  }

  return (
    <>
      {sheet.magic && (
        <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm text-[#8f8473]">
          <span>
            СЛ заклинань <b className="text-lg text-[#efe5d2]">{sheet.magic.saveDC}</b>
          </span>
          <span>
            Атака закл. <b className="text-lg text-[#efe5d2]">{signed(sheet.magic.attackBonus)}</b>
          </span>
          <span>{sheet.magic.ability}</span>
        </div>
      )}
      {sheet.slots.length > 0 && (
        <Section title="СЛОТИ">
          <div className="flex flex-wrap gap-1.5">
            {sheet.slots.map((s) => (
              <span key={s.level} aria-label={`${ROMAN[s.level]} коло: ${s.count} ${pluralUk(s.count, ["слот", "слоти", "слотів"])}`} className={cn("hud-sc metal-fill rounded-md px-3 py-1.5 text-sm", metalClass(spellTier(s.level)))}>
                {ROMAN[s.level]} · {s.count}
              </span>
            ))}
          </div>
        </Section>
      )}
      {sheet.spells.length > 0 && (
        <>
          <Button type="button" className="hud-sc mt-4 h-12 w-full gap-2 bg-[#7a2a1f] text-[#f3e7cc] hover:bg-[#8a3427]" onClick={() => setOpen(true)}>
            <BookOpen className="size-5" />
            Книга заклинань
          </Button>
          <ProfileSpellBook spells={sheet.spells} slots={sheet.slots} open={open} onOpenChange={setOpen} />
        </>
      )}
    </>
  );
}
