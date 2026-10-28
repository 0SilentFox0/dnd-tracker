"use client";

import { useTranslations } from "next-intl";

import { HudPill } from "@/components/hud/page";

export function NewPill({ count, className }: { count?: number; className?: string }) {
  const t = useTranslations("common");

  return <HudPill tone="gold" className={className}>{count && count > 1 ? t("notifications.newCount", { count }) : t("notifications.new")}</HudPill>;
}
