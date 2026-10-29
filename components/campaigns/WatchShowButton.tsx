"use client";

import { useTranslations } from "next-intl";
import { Images } from "lucide-react";

import { HeaderPillLink } from "@/components/campaigns/HeaderPillLink";
import { useWatchShow } from "@/lib/hooks/campaigns";

export function WatchShowButton() {
  const { href } = useWatchShow();

  const t = useTranslations("common.header");

  return href ? <HeaderPillLink href={href} icon={Images} label={t("watchShow").toUpperCase()} srLabel={t("watchShowAria")} /> : null;
}
