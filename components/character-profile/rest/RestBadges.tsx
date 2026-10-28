"use client";

import { useProfile } from "../ProfileContext";

import { HudPill } from "@/components/hud/page";

export function RestBadges() {
  const { sheet } = useProfile();

  const rest = sheet.rest;

  if (!rest) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
      {rest.dead && <HudPill tone="silver">Загинув</HudPill>}
      {rest.exhaustion > 0 && <HudPill tone="silver">Виснаження {rest.exhaustion}</HudPill>}
      {rest.inspiration && <HudPill tone="gold">✦ Натхнення</HudPill>}
      {rest.shortRestOpen && <HudPill tone="gold">Короткий відпочинок</HudPill>}
      {rest.xp && (
        <span className="text-hud-muted">
          Досвід {rest.xp.value}
          {rest.xp.next !== null && ` / ${rest.xp.next}`}
          {rest.xp.levelUp && <b className="ml-1 text-hud-gold">· доступне підвищення рівня</b>}
        </span>
      )}
    </div>
  );
}
