"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";

import { SpellPicksNudge } from "./path";
import { useProfile } from "./ProfileContext";
import { ProfileSpellBook } from "./ProfileSpellBook";

import { NewPill } from "@/components/common/NewPill";
import { spellLevelMetal } from "@/components/hud";
import { HudSection } from "@/components/hud/form";
import { EmptySpellBook } from "@/components/spells/book/SpellBookPages";
import { Button } from "@/components/ui/button";
import { spellLevelRoman } from "@/lib/constants/spells";
import { useSeenOnOpen } from "@/lib/hooks/notifications";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { useTranslator } from "@/lib/i18n/use-translator";
import { cn } from "@/lib/utils";
import { signed } from "@/lib/utils/common/format";

export function MagicTab() {
  const { sheet, campaignId } = useProfile();

  const t = useTranslations("characterProfile.magic");

  const tr = useTranslator();

  const newSpells = useSeenOnOpen(campaignId, { types: ["spell"], enabled: sheet.viewer.isOwner && !sheet.viewer.isDM });

  const [open, setOpen] = useState(false);

  return (
    <>
      <SpellPicksNudge />
      {newSpells.size > 0 && <NewPill count={newSpells.size} className="mb-2" />}
      {sheet.magic && (
        <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm text-hud-muted">
          <span>
            {t("saveDC")} <b className="text-lg text-hud-ink">{sheet.magic.saveDC}</b>
          </span>
          <span>
            {t("attack")} <b className="text-lg text-hud-ink">{signed(sheet.magic.attackBonus)}</b>
          </span>
          <span>{tr(`gameTerms.abilities.${sheet.magic.ability}.label`)}</span>
        </div>
      )}
      {sheet.pact && (
        <HudSection title={t("pact")}>
          <span aria-label={t("pactSlots", { current: sheet.pact.current, max: sheet.pact.max, level: spellLevelRoman(sheet.pact.level) })} className={cn("hud-sc metal-fill inline-block rounded-md px-3 py-1.5 text-sm", spellLevelMetal(sheet.pact.level))}>
            {spellLevelRoman(sheet.pact.level)} · {sheet.pact.current}/{sheet.pact.max}
          </span>
        </HudSection>
      )}
      {sheet.slots.length > 0 && (
        <HudSection title={t("slots")}>
          <div className="flex flex-wrap gap-1.5">
            {sheet.slots.map((s) => (
              <span key={s.level} aria-label={sheet.rest?.persist ? t("slotsLeft", { level: spellLevelRoman(s.level), current: s.current, count: s.count }) : t("slotsTotal", { level: spellLevelRoman(s.level), count: s.count })} className={cn("hud-sc metal-fill rounded-md px-3 py-1.5 text-sm", spellLevelMetal(s.level))}>
                {spellLevelRoman(s.level)} · {sheet.rest?.persist ? `${s.current}/${s.count}` : s.count}
              </span>
            ))}
          </div>
        </HudSection>
      )}
      {sheet.choices && sheet.spells.some((s) => sheet.choices?.spellSources[s.id]) && (
        <HudSection title={t("fromChoices")}>
          <ul className="space-y-1 text-sm">
            {sheet.spells
              .filter((s) => sheet.choices?.spellSources[s.id])
              .map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span>{s.name}</span>
                  <span className="text-xs text-hud-muted">{translateIssue(tr, sheet.choices?.spellSources[s.id] ?? { message: "" })}</span>
                </li>
              ))}
          </ul>
        </HudSection>
      )}
      {sheet.spells.length > 0 ? (
        <>
          <Button type="button" className="hud-sc mt-4 h-12 w-full gap-2 bg-[#7a2a1f] text-[#f3e7cc] hover:bg-[#8a3427]" onClick={() => setOpen(true)}>
            <BookOpen className="size-5" />
            {t("book")}
          </Button>
          <ProfileSpellBook spells={sheet.spells} slots={sheet.slots} open={open} onOpenChange={setOpen} />
        </>
      ) : (
        <div className="mt-4 first:mt-0">
          <EmptySpellBook text={t("emptyBook")} />
        </div>
      )}
    </>
  );
}
