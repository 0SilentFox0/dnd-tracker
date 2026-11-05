"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { LevelBookmarks } from "@/components/spells/book/LevelBookmarks";
import { SchoolHeading } from "@/components/spells/book/SchoolHeading";
import { SchoolTabs } from "@/components/spells/book/SchoolTabs";
import { SpellRow } from "@/components/spells/book/SpellRow";
import { SpellBattlePreview } from "@/components/spells/preview/SpellBattlePreview";
import { SpellIcon } from "@/components/spells/SpellIcon";
import { spellSchoolColor } from "@/lib/constants/spells";
import { useSchoolFilter, useSpellLabels } from "@/lib/hooks/spells";
import { useTranslator } from "@/lib/i18n/use-translator";
import { cn } from "@/lib/utils";
import type { BookSpell } from "@/types/spells";

const PAPER = "hud-book spell-book relative bg-[var(--book-page,#e9dec5)] text-[var(--book-ink,#2a2018)]";

export interface SpellBookPagesProps {
  byLevel: Record<number, BookSpell[]>;
  page: { level: number; slotOf: (level: number) => number; hideSlots?: boolean; onLevel: (level: number) => void };
  pick: { pickedId: string | null; onPick: (spell: BookSpell) => void; formulaOf?: (spell: BookSpell) => string; badgeOf?: (spell: BookSpell) => string | undefined };
  layout: { wide: boolean; showDetail: boolean };
  detail: ReactNode;
}

export function SpellBookPages({ byLevel, page, pick, layout, detail }: SpellBookPagesProps) {
  const t = useTranslations("spells.book");

  const tg = useTranslator("gameTerms");

  const { level, slotOf, hideSlots, onLevel } = page;

  const { pickedId, onPick, formulaOf, badgeOf } = pick;

  const { wide, showDetail } = layout;

  const filter = useSchoolFilter(byLevel, level);

  return (
    <div className="relative pr-11">
      <LevelBookmarks level={level} slotOf={slotOf} hideSlots={hideSlots} onLevel={onLevel} />
      <div className={cn(PAPER, "min-h-[70dvh]", wide ? "grid grid-cols-2" : "flex flex-col")}>
        {(wide || !showDetail) && (
          <div className="px-5 pb-12 pt-4">
            {filter.schools.length > 1 && <SchoolTabs schools={filter.schools} active={filter.school} countOf={filter.countOf} onPick={filter.setSchool} />}
            <div className="spell-book-muted text-[13px] italic">{t("title")}</div>
            <div className="hud-sc flex items-center gap-3 text-2xl font-bold leading-8">
              {tg(`spellLevels.${level}`)}
            </div>
            <div className="spell-book-rule my-1 h-px" />
            {filter.shown.length === 0 && <p className="spell-book-muted py-6 text-center italic">{filter.isAll ? t("emptyLevel") : t("emptyLevelSchool")}</p>}
            {filter.shown.map((g) => (
              <section key={g.name} className="mt-3 first:mt-1">
                {filter.isAll && <SchoolHeading school={g} />}
                {g.spells.map((s) => (
                  <SpellRow key={s.id} spell={s} school={g} wide={wide} picked={pickedId === s.id} extras={{ formula: formulaOf?.(s), badge: badgeOf?.(s) }} onPick={onPick} />
                ))}
              </section>
            ))}
          </div>
        )}
        {wide ? (
          <div className="sticky top-0 flex min-h-[70dvh] flex-col self-start">
            {detail ?? <div className="spell-book-muted flex flex-1 items-center justify-center italic">{t("pick")}</div>}
          </div>
        ) : (
          showDetail && detail
        )}
      </div>
    </div>
  );
}

export function EmptySpellBook({ text }: { text: string }) {
  const t = useTranslations("spells.book");

  return (
    <div className={cn(PAPER, "flex min-h-56 flex-col items-center justify-center gap-2 px-6 py-10 text-center")}>
      <div className="spell-book-muted text-[13px] italic">{t("title")}</div>
      <p className="hud-sc text-lg leading-6">{text}</p>
    </div>
  );
}

export function SpellDetail({ spell, formula, children }: { spell: BookSpell; formula?: string; children?: ReactNode }) {
  const t = useTranslations("spells.book");

  const tg = useTranslator("gameTerms");

  const locale = useLocale();

  const labels = useSpellLabels();

  const rows = [
    ...(formula === "" ? [] : [[t("power"), formula ?? (spell.dice ? t("baseDice", { dice: spell.dice }) : "—")]]),
    [t("target"), spell.targeting ? labels.targeting(spell.targeting) : "—"],
    [t("check"), spell.resolution ? labels.resolution(spell.resolution) : labels.resolution({ kind: "auto" })],
    [t("cost"), labels.cost(spell.cost ?? "action")],
  ];

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="spell-book-border spell-book-accent flex size-16 items-center justify-center border bg-[color-mix(in_srgb,var(--book-accent,#7a2a1f)_10%,transparent)]">
          <SpellIcon spell={spell} size={44} iconClassName="size-10" />
        </span>
        <div>
          <div className="hud-sc text-[26px] font-bold leading-[30px]">{spell.name}</div>
          <div className="spell-book-muted text-sm italic">{t("schoolAndLevel", { school: spell.spellGroup?.name ?? t("noSchool"), level: tg(`spellLevels.${spell.level}`).toLocaleLowerCase(locale) })}</div>
        </div>
      </div>
      {spell.executionMode === "manual" && <p role="status">{t("manual")}</p>}
      {spell.description && (
        <p className="mt-4 border-l-4 pl-4 text-[19px] font-medium italic leading-7" style={{ borderColor: spellSchoolColor(spell.spellGroup), color: "var(--book-ink, #3b2716)" }}>
          {spell.description}
        </p>
      )}
      {spell.executionMode !== "manual" && <div className="spell-book-border mt-4 grid grid-cols-2 border-t">
        {rows.map(([a, b]) => (
          <div key={a} className="spell-book-border flex h-12 flex-col justify-center border-b odd:border-r odd:pr-3 even:pl-3">
            <span className="spell-book-muted text-xs italic">{a}</span>
            <span className="text-base">{b}</span>
          </div>
        ))}
      </div>}
      {spell.appearanceDescription && <p className="spell-book-accent mt-5 text-[17px] leading-6 first-letter:float-left first-letter:pr-1.5 first-letter:pt-1 first-letter:font-[family-name:var(--font-hud-sc)] first-letter:text-[52px] first-letter:leading-[44px]">{spell.appearanceDescription}</p>}
      {spell.executionMode !== "manual" && <SpellBattlePreview key={spell.id} spell={{ id: spell.id, name: spell.name, level: spell.level, groupId: spell.spellGroup?.id ?? null, fx: spell.fx, rules: spell }} variant="book" className="clear-left mt-4" />}
      {children}
    </>
  );
}
