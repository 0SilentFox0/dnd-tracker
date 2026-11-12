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
import { systemUiOf } from "@/components/systems";
import { signed } from "@/lib/utils/common/format";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";
import { statColumnsOf } from "@/lib/utils/rules/systems/stats";

export function ProfileHero({ actions, badge, ref }: { actions?: ReactNode; badge?: ReactNode; ref?: Ref<HTMLElement> }) {
  const { sheet, canEdit } = useProfile();

  const t = useTranslations("characterProfile.hero");

  const [hpOpen, setHpOpen] = useState(false);

  const id = sheet.identity;

  const Ui = systemUiOf(sheet.system);

  const system = RULE_SYSTEM_REGISTRY[sheet.system];

  const hpKey = Ui.hideProgression ? ({ current: "woundsCurrent", total: "woundsTotal" } as const) : ({ current: "hpCurrent", total: "hpTotal" } as const);

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
                  {!Ui.hideProgression && `${t("level", { level: id.level })} · `}{sheet.hitDice === null && !Ui.hideProgression && `${id.archetype} · `}{statColumnsOf(system).has("classes") && `${id.className}${id.subclass ? ` (${id.subclass})` : ""} · `}
                </span>
                {badge}
                {id.raceIcon && <OptimizedImage src={id.raceIcon} alt="" width={14} height={14} className="size-3.5 shrink-0 rounded-sm" />}
                <span className="truncate">
                  {id.race}{id.subrace ? ` (${id.subrace})` : ""}
                  {system.identity.alignments && id.alignment ? ` · ${id.alignment}` : ""}
                </span>
              </p>
              <button type="button" aria-expanded={hpOpen} onClick={() => setHpOpen((v) => !v)} className="mt-1 text-sm text-hud-bone underline-offset-2 hover:underline">
                {sheet.rest?.hp ? `${t(hpKey.current, { current: sheet.rest.hp.current, max: sheet.rest.hp.max })}${sheet.rest.hp.temp ? ` (+${sheet.rest.hp.temp})` : ""}` : t(hpKey.total, { total: sheet.hp.total })}
                {sheet.hitDice && ` · ${sheet.hitDice}`}
              </button>
              {sheet.classTable?.map((line) => (
                <p key={line} className="text-xs text-hud-muted">{line}</p>
              ))}
              {sheet.rest && <RestBadges />}
              {sheet.rest && system.rest.kinds && <HitDicePanel />}
              {sheet.rest && system.rest.kinds && <ArcaneRecoveryPanel />}
            </div>
            {actions && <div className="flex shrink-0 flex-col gap-1.5">{actions}</div>}
          </div>
          {hpOpen && <Breakdown lines={sheet.hp.lines} />}
          <div className="mt-3 flex gap-1.5">
            <Ui.HeroStats />
          </div>
        </div>
      </div>
    </header>
  );
}

export function CompactHero() {
  const { sheet } = useProfile();

  const t = useTranslations("characterProfile.hero");

  const hideProgression = systemUiOf(sheet.system).hideProgression;

  const hp = sheet.rest?.hp ? t(hideProgression ? "woundsCurrent" : "hpCurrent", { current: sheet.rest.hp.current, max: sheet.rest.hp.max }) : t(hideProgression ? "woundsTotal" : "hpTotal", { total: sheet.hp.total });

  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-2 text-xs text-hud-muted">
      <span className="hud-sc truncate text-sm text-hud-ink">
        {sheet.identity.name}
        {!hideProgression && ` · ${sheet.identity.level}`}
      </span>
      <span className="shrink-0 tabular-nums">
        {hp}
        {!hideProgression && ` · AC ${sheet.armorClass.total} · ${t("short.toHit")} ${sheet.bestToHit === null ? "—" : signed(sheet.bestToHit)}`}
      </span>
    </div>
  );
}
