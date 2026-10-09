"use client";

import { type ReactNode, type Ref, useState } from "react";

import { Breakdown } from "./Breakdown";
import { HeroPortrait } from "./HeroPortrait";
import { useProfile } from "./ProfileContext";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { HudStatChip } from "@/components/hud/page";
import { signed } from "@/lib/utils/format";

export function ProfileHero({ actions, badge, ref }: { actions?: ReactNode; badge?: ReactNode; ref?: Ref<HTMLElement> }) {
  const { sheet } = useProfile();

  const [hpOpen, setHpOpen] = useState(false);

  const id = sheet.identity;

  return (
    <header ref={ref} className="px-4 pt-4 pb-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <HeroPortrait src={id.avatar} name={id.name} className="lg:w-80 lg:shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="hud-sc truncate text-xl leading-7 text-hud-ink">{id.name}</h1>
              <p className="flex min-w-0 items-center gap-1.5 text-xs text-hud-muted">
                <span className="truncate">
                  {id.level} рів. · {id.archetype} · {id.className}
                  {id.subclass ? ` (${id.subclass})` : ""} ·
                </span>
                {badge}
                {id.raceIcon && <OptimizedImage src={id.raceIcon} alt="" width={14} height={14} className="size-3.5 shrink-0 rounded-sm" />}
                <span className="truncate">
                  {id.race}
                  {id.alignment ? ` · ${id.alignment}` : ""}
                </span>
              </p>
              <button type="button" aria-expanded={hpOpen} onClick={() => setHpOpen((v) => !v)} className="mt-1 text-sm text-hud-bone underline-offset-2 hover:underline">
                HP {sheet.hp.total}
              </button>
            </div>
            {actions && <div className="flex shrink-0 flex-col gap-1.5">{actions}</div>}
          </div>
          {hpOpen && <Breakdown lines={sheet.hp.lines} />}
          <div className="mt-3 flex gap-1.5">
            <HudStatChip size="lg" label="AC" short="AC" value={String(sheet.armorClass.total)} />
            <HudStatChip size="lg" label="Ініціатива" short="Ініц" value={String(sheet.initiative)} />
            <HudStatChip size="lg" label="Швидкість" short="Швидк" value={String(sheet.speed)} />
            <HudStatChip size="lg" label="Влучання" short="Влуч" value={sheet.bestToHit === null ? "—" : signed(sheet.bestToHit)} />
            <HudStatChip size="lg" label="Майстерність" short="Майст" value={signed(sheet.proficiency)} />
          </div>
        </div>
      </div>
    </header>
  );
}

export function CompactHero() {
  const { sheet } = useProfile();

  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-2 text-xs text-hud-muted">
      <span className="hud-sc truncate text-sm text-hud-ink">
        {sheet.identity.name} · {sheet.identity.level}
      </span>
      <span className="shrink-0 tabular-nums">
        HP {sheet.hp.total} · AC {sheet.armorClass.total} · Влуч {sheet.bestToHit === null ? "—" : signed(sheet.bestToHit)}
      </span>
    </div>
  );
}
