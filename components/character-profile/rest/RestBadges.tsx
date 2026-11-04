"use client";

import { useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";

import { HudPill } from "@/components/hud/page";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";

export function RestBadges() {
  const t = useTranslations("rest.badges");

  const { sheet } = useProfile();

  const rest = sheet.rest;

  const system = RULE_SYSTEM_REGISTRY[sheet.system];

  if (!rest) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
      {rest.dead && <HudPill tone="silver">{t("dead")}</HudPill>}
      {sheet.wfrp && <HudPill tone="gold">{t("fortune", { current: sheet.wfrp.fortune, max: sheet.wfrp.fate })}</HudPill>}
      {system.d20Stats && rest.exhaustion > 0 && <HudPill tone="silver">{t("exhaustion", { level: rest.exhaustion })}</HudPill>}
      {system.d20Stats && rest.inspiration && <HudPill tone="gold">{t("inspiration")}</HudPill>}
      {system.rest.kinds && rest.shortRestOpen && <HudPill tone="gold">{t("shortRest")}</HudPill>}
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
