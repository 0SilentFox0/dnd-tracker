"use client";

import { useTranslations } from "next-intl";

import { skillLabel } from "./skill-label";

import { useProfile } from "@/components/character-profile/ProfileContext";
import { HudSection } from "@/components/hud/form";
import { EmptySpellBook } from "@/components/spells/book/SpellBookPages";
import { groupSpellsBySchool, NO_SCHOOL } from "@/lib/utils/spells/group-by-school";
import type { SheetWfrpBlock } from "@/systems/wfrp/rules/characteristics/sheet-block";
import { SHEET_SLOT } from "@/systems/wfrp/rules/slots";

const CHANNELLING = "channelling";

function targetOf(block: SheetWfrpBlock | undefined, key: string, spec?: string): number | null {
  const skill = block?.skills.find((s) => s.key === key && s.spec === spec);

  return skill?.target ?? null;
}

export function MagicTab() {
  const { sheet } = useProfile();

  const t = useTranslations("wfrpMagic.ui.sheet");

  const tk = useTranslations("wfrpMagic.ui.kind");

  const tg = useTranslations("gameTerms");

  const groups = groupSpellsBySchool(sheet.spells);

  const block = SHEET_SLOT.read(sheet.systemSlot);

  const casting = targetOf(block, "language", "magick");

  const channelling = targetOf(block, CHANNELLING) ?? block?.characteristics.find((c) => c.key === "wp")?.value ?? null;

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm text-hud-muted">
        <span>
          {skillLabel(tg, "language", "magick")} <b className="text-lg text-hud-ink">{casting ?? "—"}</b>
        </span>
        <span>
          {skillLabel(tg, CHANNELLING)} <b className="text-lg text-hud-ink">{channelling ?? "—"}</b>
        </span>
      </div>
      {groups.length === 0 ? (
        <EmptySpellBook text={t("empty")} />
      ) : (
        groups.map((g) => (
          <HudSection key={g.name} title={g.name === NO_SCHOOL ? t("noLore") : g.name}>
            <ul className="space-y-1 text-sm">
              {g.spells.map((s) => {
                const magic = s.casting?.magic;

                return (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span>{s.name}</span>
                    {magic && (
                      <span className="text-xs text-hud-muted">
                        {t("cn", { cn: magic.cn })} · {tk(magic.kind)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </HudSection>
        ))
      )}
    </>
  );
}
