"use client";

import { type ReactNode, type Ref, useState } from "react";

import { Breakdown } from "./Breakdown";
import { useProfile } from "./ProfileContext";

import { EntityIcon } from "@/components/common/EntityIcon";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { signed } from "@/lib/utils/format";

function Chip({ label, short, value }: { label: string; short: string; value: string }) {
  return (
    <div aria-label={label} className="min-w-0 flex-1 rounded-lg border border-[#4a3c2c] bg-[#1c1610] px-1 py-1 text-center">
      <b className="block text-lg leading-6 text-[#efe5d2]">{value}</b>
      <span className="text-[10px] uppercase text-[#8f8473]">{short}</span>
    </div>
  );
}

export function ProfileHero({ actions, ref }: { actions?: ReactNode; ref?: Ref<HTMLElement> }) {
  const { sheet } = useProfile();

  const [hpOpen, setHpOpen] = useState(false);

  const id = sheet.identity;

  return (
    <header ref={ref} className="px-4 pt-4 pb-3">
      <div className="flex items-center gap-3">
        <EntityIcon src={id.avatar} name={id.name} size={56} className="hud-sc size-14 rounded-full border-2 border-[#c9b37a] bg-[#2a2016] text-2xl text-inherit" />
        <div className="min-w-0 flex-1">
          <h1 className="hud-sc truncate text-xl leading-7 text-[#efe5d2]">{id.name}</h1>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-[#8f8473]">
            <span className="truncate">
              {id.level} рів. · {id.className}
              {id.subclass ? ` (${id.subclass})` : ""} ·
            </span>
            {id.raceIcon && <OptimizedImage src={id.raceIcon} alt="" width={14} height={14} className="size-3.5 shrink-0 rounded-sm" />}
            <span className="truncate">
              {id.race}
              {id.alignment ? ` · ${id.alignment}` : ""}
            </span>
          </p>
          <button type="button" aria-expanded={hpOpen} onClick={() => setHpOpen((v) => !v)} className="mt-1 text-sm text-[#e6dccb] underline-offset-2 hover:underline">
            HP {sheet.hp.total}
          </button>
        </div>
        {actions && <div className="flex shrink-0 flex-col gap-1.5">{actions}</div>}
      </div>
      {hpOpen && <Breakdown lines={sheet.hp.lines} />}
      <div className="mt-3 flex gap-1.5">
        <Chip label="AC" short="AC" value={String(sheet.armorClass.total)} />
        <Chip label="Ініціатива" short="Ініц" value={signed(sheet.initiative)} />
        <Chip label="Швидкість" short="Швидк" value={String(sheet.speed)} />
        <Chip label="Влучання" short="Влуч" value={sheet.bestToHit === null ? "—" : signed(sheet.bestToHit)} />
        <Chip label="Майстерність" short="Майст" value={signed(sheet.proficiency)} />
      </div>
    </header>
  );
}

export function CompactHero() {
  const { sheet } = useProfile();

  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-2 text-xs text-[#8f8473]">
      <span className="hud-sc truncate text-sm text-[#efe5d2]">
        {sheet.identity.name} · {sheet.identity.level}
      </span>
      <span className="shrink-0 tabular-nums">
        HP {sheet.hp.total} · AC {sheet.armorClass.total} · Влуч {sheet.bestToHit === null ? "—" : signed(sheet.bestToHit)}
      </span>
    </div>
  );
}
