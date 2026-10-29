"use client";

import { useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";

import { HudPill } from "@/components/hud/page";

export function RestBadges() {
  const t = useTranslations("rest.badges");

  const { sheet } = useProfile();

  const rest = sheet.rest;

  if (!rest) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
      {rest.dead && <HudPill tone="silver">{t("dead")}</HudPill>}
      {rest.exhaustion > 0 && <HudPill tone="silver">{t("exhaustion", { level: rest.exhaustion })}</HudPill>}
      {rest.inspiration && <HudPill tone="gold">{t("inspiration")}</HudPill>}
      {rest.shortRestOpen && <HudPill tone="gold">{t("shortRest")}</HudPill>}
      {rest.xp && (
        <span className="text-hud-muted">
          {t("xp", { value: rest.xp.value })}
          {rest.xp.next !== null && t("xpNext", { next: rest.xp.next })}
          {rest.xp.levelUp && <b className="ml-1 text-hud-gold">{t("levelUp")}</b>}
        </span>
      )}
    </div>
  );
}
