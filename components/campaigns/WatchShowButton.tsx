"use client";

import { useTranslations } from "next-intl";
import { Images } from "lucide-react";

import { HeaderPillLink } from "@/components/campaigns/HeaderPillLink";
import { useWatchShow } from "@/lib/hooks/campaigns";
import { useActiveDemoTour } from "@/lib/onboarding/active-demo-tour";

export function WatchShowButton() {
  const { href } = useWatchShow();

  const t = useTranslations("common.header");

  const demoShowTour = useActiveDemoTour() === "show";

  return href || demoShowTour ? <HeaderPillLink href={href} icon={Images} label={t("watchShow").toUpperCase()} srLabel={t("watchShowAria")} data-tour="show.header" /> : null;
}
