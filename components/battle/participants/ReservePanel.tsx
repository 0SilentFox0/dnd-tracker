"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ReserveParticipantRow } from "./ReserveParticipantRow";

import { SideDot } from "@/components/battle/hud";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

const SIDES = [
  { side: ParticipantSide.ALLY, label: "allies" },
  { side: ParticipantSide.ENEMY, label: "enemies" },
] as const;

function ReserveList() {
  const t = useTranslations("battle.sides");

  const { roster: { reserve } } = useBattleScene();

  return SIDES.map(({ side, label }) => {
    const list = reserve.filter((p) => p.basicInfo.side === side);

    if (list.length === 0) return null;

    return (
      <div key={side}>
        <div className="hud-sc flex items-center gap-2 pt-2 text-[13px] tracking-[.1em] text-[var(--hud-muted)]">
          <SideDot side={side} />
          {t(label)}
        </div>
        {list.map((p) => <ReserveParticipantRow key={p.basicInfo.id} participant={p} />)}
      </div>
    );
  });
}

/** Резерв поза картою: у вигляді «Карта» ДМ бачить і вводить його тут (roster.reserve порожній для гравців). */
export function ReserveGroup() {
  const t = useTranslations("battle.reserve");

  const { roster: { reserve } } = useBattleScene();

  if (reserve.length === 0) return null;

  return (
    <section aria-label={t("aria")}>
      <h3 className="hud-sc flex h-8 items-center border-b border-white/[.14] text-[15px] font-bold tracking-[.1em] text-[#a89c88]">{t("title", { count: reserve.length })}</h3>
      <ReserveList />
    </section>
  );
}

export function ReserveSheetButton() {
  const t = useTranslations("battle.reserve");

  const { roster: { reserve } } = useBattleScene();

  const [open, setOpen] = useState(false);

  if (reserve.length === 0) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hud-sc flex shrink-0 items-center px-2 text-[14px] tracking-[.06em] text-[var(--gold)]">
        {t("title", { count: reserve.length })}
      </button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title={t("title", { count: reserve.length })} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        <ReserveList />
      </ResponsiveDialog>
    </>
  );
}
