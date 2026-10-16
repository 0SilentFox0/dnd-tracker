"use client";

import { useState } from "react";
import Image from "next/image";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { cn } from "@/lib/utils";
import { isDown } from "@/lib/utils/battle/participant/state";
import type { BattleParticipant } from "@/types/battle";

export function Portrait({ participant, size = 40, current, me, extra, zoomable, className }: {
  participant: BattleParticipant;
  size?: number;
  current?: boolean;
  me?: boolean;
  extra?: boolean;
  /** клік відкриває аватар у повний розмір (портрет часто лежить усередині кнопки рядка — клік не йде далі) */
  zoomable?: boolean;
  className?: string;
}) {
  const { avatar, name, side } = participant.basicInfo;

  const [zoomed, setZoomed] = useState(false);

  const canZoom = zoomable && !!avatar;

  const open = (e: { stopPropagation(): void; preventDefault(): void }) => {
    e.stopPropagation();
    e.preventDefault();
    setZoomed(true);
  };

  const down = isDown(participant);

  const ring = side === ParticipantSide.ALLY ? "var(--ally)" : "var(--enemy)";

  return (
    <>
    <span
      {...(canZoom && { role: "button", tabIndex: 0, "aria-label": `${name}: аватар у повний розмір`, onClick: open, onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && open(e) })}
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#241d16] text-xs font-bold", canZoom && "cursor-zoom-in", down && "grayscale brightness-50", className)}
      style={{
        width: size,
        height: size,
        boxShadow: current
          ? `0 0 0 2px var(--bone), 0 0 0 4px ${ring}`
          : me
            ? `0 0 0 2px ${ring}, 0 0 0 3px #000, 0 0 0 5px var(--gold)`
            : extra
              ? `0 0 0 2px var(--gold), 0 0 0 3px #000`
              : `0 0 0 2px ${ring}, 0 0 0 3px #000`,
      }}
    >
      {avatar ? <Image src={avatar} alt={name} fill sizes={`${size}px`} className="object-cover" /> : name.slice(0, 2)}
      {extra && <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-[var(--gold)] text-[10px] leading-none text-black">+</span>}
    </span>
    {canZoom && zoomed && (
      // події з порталу спливають деревом React до кнопки рядка — зупиняємо тут
      <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <ResponsiveDialog open onOpenChange={setZoomed} title={name} size="lg" hud>
          <div className="relative mx-auto aspect-square w-full max-w-[min(80vh,640px)]">
            <Image src={avatar} alt={name} fill sizes="640px" className="object-contain" />
          </div>
        </ResponsiveDialog>
      </span>
    )}
    </>
  );
}
