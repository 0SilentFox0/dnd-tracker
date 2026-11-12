"use client";

import { useTranslations } from "next-intl";

import { HudPill } from "@/components/hud/page";
import type { RestBadgesProps } from "@/components/systems/types";

export function RestBadges({ sheet }: RestBadgesProps) {
  const t = useTranslations("rest.badges");

  const { rest } = sheet;

  if (!rest) return null;

  return (
    <>
      {rest.exhaustion > 0 && <HudPill tone="silver">{t("exhaustion", { level: rest.exhaustion })}</HudPill>}
      {rest.inspiration && <HudPill tone="gold">{t("inspiration")}</HudPill>}
    </>
  );
}
