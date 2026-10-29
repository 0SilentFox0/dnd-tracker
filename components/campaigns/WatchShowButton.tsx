"use client";

import { useTranslations } from "next-intl";
import { Images } from "lucide-react";

import { HeaderPillLink } from "@/components/campaigns/HeaderPillLink";
import { useWatchShow } from "@/lib/hooks/campaigns";

export function WatchShowButton() {
  const { href } = useWatchShow();

  const t = useTranslations("common.dmSections");

  return href ? <HeaderPillLink href={href} icon={Images} label={t("show").toUpperCase()} srLabel={t("show")} /> : null;
}
