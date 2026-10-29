"use client";

import { type ReactNode, type Ref, useState } from "react";
import { useTranslations } from "next-intl";

import { ArcaneRecoveryPanel } from "./rest/ArcaneRecoveryPanel";
import { HitDicePanel } from "./rest/HitDicePanel";
import { RestBadges } from "./rest/RestBadges";
import { Breakdown } from "./Breakdown";
import { HeroPortrait } from "./HeroPortrait";
import { useProfile } from "./ProfileContext";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { HudStatChip } from "@/components/hud/page";
import { signed } from "@/lib/utils/common/format";

export function ProfileHero({ actions, badge, ref }: { actions?: ReactNode; badge?: ReactNode; ref?: Ref<HTMLElement> }) {
  const { sheet, canEdit } = useProfile();

  const t = useTranslations("characterProfile.hero");

  const tc = useTranslations("common.stats");

  const [hpOpen, setHpOpen] = useState(false);

  const id = sheet.identity;

  return (
    <header ref={ref} className="px-4 pt-4 pb-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <HeroPortrait src={id.avatar} name={id.name} canEdit={canEdit} className="lg:w-80 lg:shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="hud-sc truncate text-xl leading-7 text-hud-ink">{id.name}</h1>
              <p className="flex min-w-0 items-center gap-1.5 text-xs text-hud-muted">
                <span className="truncate">
                  {t("level", { level: id.level })} · {sheet.hitDice === null && `${id.archetype} · `}{id.className}
                  {id.subclass ? ` (${id.subclass})` : ""} ·
                </span>
                {badge}
                {id.raceIcon && <OptimizedImage src={id.raceIcon} alt="" width={14} height={14} className="size-3.5 shrink-0 rounded-sm" />}
                <span className="truncate">
                  {id.race}{id.subrace ? ` (${id.subrace})` : ""}
                  {id.alignment ? ` · ${id.alignment}` : ""}
                </span>
              </p>
              <button type="button" aria-expanded={hpOpen} onClick={() => setHpOpen((v) => !v)} className="mt-1 text-sm text-hud-bone underline-offset-2 hover:underline">
                {sheet.rest?.hp ? `${t("hpCurrent", { current: sheet.rest.hp.current, max: sheet.rest.hp.max })}${sheet.rest.hp.temp ? ` (+${sheet.rest.hp.temp})` : ""}` : t("hpTotal", { total: sheet.hp.total })}
                {sheet.hitDice && ` · ${sheet.hitDice}`}
              </button>
              {sheet.classTable?.map((line) => (
                <p key={line} className="text-xs text-hud-muted">{line}</p>
              ))}
              {sheet.rest && <RestBadges />}
              {sheet.rest && <HitDicePanel />}
              {sheet.rest && <ArcaneRecoveryPanel />}
            </div>
            {actions && <div className="flex shrink-0 flex-col gap-1.5">{actions}</div>}
          </div>
          {hpOpen && <Breakdown lines={sheet.hp.lines} />}
          <div className="mt-3 flex gap-1.5">
            <HudStatChip size="lg" label="AC" short="AC" value={String(sheet.armorClass.total)} />
            <HudStatChip size="lg" label={tc("initiative")} short={t("short.initiative")} value={String(sheet.initiative)} />
            <HudStatChip size="lg" label={tc("speed")} short={t("short.speed")} value={String(sheet.speed)} />
            <HudStatChip size="lg" label={t("toHit")} short={t("short.toHit")} value={sheet.bestToHit === null ? "—" : signed(sheet.bestToHit)} />
            <HudStatChip size="lg" label={t("proficiency")} short={t("short.proficiency")} value={signed(sheet.proficiency)} />
          </div>
        </div>
      </div>
    </header>
  );
}

export function CompactHero() {
  const { sheet } = useProfile();

  const t = useTranslations("characterProfile.hero");

  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-2 text-xs text-hud-muted">
      <span className="hud-sc truncate text-sm text-hud-ink">
        {sheet.identity.name} · {sheet.identity.level}
      </span>
      <span className="shrink-0 tabular-nums">
        {sheet.rest?.hp ? t("hpCurrent", { current: sheet.rest.hp.current, max: sheet.rest.hp.max }) : t("hpTotal", { total: sheet.hp.total })} · AC {sheet.armorClass.total} · {t("short.toHit")} {sheet.bestToHit === null ? "—" : signed(sheet.bestToHit)}
      </span>
    </div>
  );
}
