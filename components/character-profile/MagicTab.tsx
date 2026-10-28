"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";

import { useProfile } from "./ProfileContext";
import { ProfileSpellBook } from "./ProfileSpellBook";

import { spellLevelMetal } from "@/components/hud";
import { HudSection } from "@/components/hud/form";
import { EmptySpellBook } from "@/components/spells/book/SpellBookPages";
import { Button } from "@/components/ui/button";
import { spellLevelRoman } from "@/lib/constants/spells";
import { cn } from "@/lib/utils";
import { signed } from "@/lib/utils/common/format";
import { pluralUk } from "@/lib/utils/common/plural";

export function MagicTab() {
  const { sheet } = useProfile();

  const [open, setOpen] = useState(false);

  return (
    <>
      {sheet.magic && (
        <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm text-hud-muted">
          <span>
            СЛ заклинань <b className="text-lg text-hud-ink">{sheet.magic.saveDC}</b>
          </span>
          <span>
            Атака закл. <b className="text-lg text-hud-ink">{signed(sheet.magic.attackBonus)}</b>
          </span>
          <span>{sheet.magic.ability}</span>
        </div>
      )}
      {sheet.pact && (
        <HudSection title="ПАКТ">
          <span aria-label={`Слоти пакту: ${sheet.pact.current} з ${sheet.pact.max}, ${spellLevelRoman(sheet.pact.level)} коло`} className={cn("hud-sc metal-fill inline-block rounded-md px-3 py-1.5 text-sm", spellLevelMetal(sheet.pact.level))}>
            {spellLevelRoman(sheet.pact.level)} · {sheet.pact.current}/{sheet.pact.max}
          </span>
        </HudSection>
      )}
      {sheet.slots.length > 0 && (
        <HudSection title="СЛОТИ">
          <div className="flex flex-wrap gap-1.5">
            {sheet.slots.map((s) => (
              <span key={s.level} aria-label={sheet.rest?.persist ? `${spellLevelRoman(s.level)} коло: залишилось ${s.current} з ${s.count}` : `${spellLevelRoman(s.level)} коло: ${s.count} ${pluralUk(s.count, ["слот", "слоти", "слотів"])}`} className={cn("hud-sc metal-fill rounded-md px-3 py-1.5 text-sm", spellLevelMetal(s.level))}>
                {spellLevelRoman(s.level)} · {sheet.rest?.persist ? `${s.current}/${s.count}` : s.count}
              </span>
            ))}
          </div>
        </HudSection>
      )}
      {sheet.spells.length > 0 ? (
        <>
          <Button type="button" className="hud-sc mt-4 h-12 w-full gap-2 bg-[#7a2a1f] text-[#f3e7cc] hover:bg-[#8a3427]" onClick={() => setOpen(true)}>
            <BookOpen className="size-5" />
            Книга заклинань
          </Button>
          <ProfileSpellBook spells={sheet.spells} slots={sheet.slots} open={open} onOpenChange={setOpen} />
        </>
      ) : (
        <div className="mt-4 first:mt-0">
          <EmptySpellBook text="Поки що Герой більше довіряє своєму мечу і луку" />
        </div>
      )}
    </>
  );
}
