"use client";

import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";

import { HeaderPillLink } from "@/components/campaigns/HeaderPillLink";
import { useJoinBattle } from "@/lib/hooks/campaigns";

export function JoinBattleButton() {
  const { href } = useJoinBattle();

  const t = useTranslations("common.header");

  return href ? <HeaderPillLink href={href} icon={Swords} label={t("joinBattle").toUpperCase()} srLabel={t("joinBattleAria")} /> : null;
}
