"use client";

import { useState } from "react";

import { ReserveParticipantRow } from "./ReserveParticipantRow";

import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

const SIDES = [
  { side: ParticipantSide.ALLY, label: "Союзники", color: "var(--ally)" },
  { side: ParticipantSide.ENEMY, label: "Вороги", color: "var(--enemy)" },
];

function ReserveList() {
  const { roster: { reserve } } = useBattleScene();

  return SIDES.map(({ side, label, color }) => {
    const list = reserve.filter((p) => p.basicInfo.side === side);

    if (list.length === 0) return null;

    return (
      <div key={side}>
        <div className="hud-sc flex items-center gap-2 pt-2 text-[13px] tracking-[.1em] text-[var(--hud-muted)]">
          <i className="size-2 rounded-full" style={{ background: color }} />
          {label}
        </div>
        {list.map((p) => <ReserveParticipantRow key={p.basicInfo.id} participant={p} />)}
      </div>
    );
  });
}

const title = (n: number) => `Резерв (${n})`;

/** Резерв поза картою: у вигляді «Карта» ДМ бачить і вводить його тут (roster.reserve порожній для гравців). */
export function ReserveGroup() {
  const { roster: { reserve } } = useBattleScene();

  if (reserve.length === 0) return null;

  return (
    <section aria-label="Резерв">
      <h3 className="hud-sc flex h-8 items-center border-b border-white/[.14] text-[15px] font-bold tracking-[.1em] text-[#a89c88]">{title(reserve.length)}</h3>
      <ReserveList />
    </section>
  );
}

export function ReserveSheetButton() {
  const { roster: { reserve } } = useBattleScene();

  const [open, setOpen] = useState(false);

  if (reserve.length === 0) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hud-sc flex shrink-0 items-center px-2 text-[14px] tracking-[.06em] text-[var(--gold)]">
        {title(reserve.length)}
      </button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title={title(reserve.length)} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        <ReserveList />
      </ResponsiveDialog>
    </>
  );
}
