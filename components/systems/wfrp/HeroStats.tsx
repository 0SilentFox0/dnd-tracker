"use client";

import { useTranslations } from "next-intl";

import { useProfile } from "@/components/character-profile/ProfileContext";
import { HudStatChip } from "@/components/hud/page";

export function HeroStats() {
  const { sheet } = useProfile();

  const t = useTranslations("characterProfile.hero");

  const tc = useTranslations("wfrpCorruption.chip");

  const tg = useTranslations("gameTerms");

  const block = sheet.wfrp;

  if (!block) return null;

  const yd = tg("distanceUnit.yd");

  return (
    <>
      <HudStatChip size="lg" label={t("wounds")} short={t("short.wounds")} value={String(block.wounds.max)} />
      <HudStatChip size="lg" label={t("move")} short={t("short.move")} value={`${block.move.walkYd}/${block.move.runYd} ${yd}`} />
      <HudStatChip size="lg" label={t("fate")} short={t("short.fate")} value={String(block.fate)} />
      <HudStatChip size="lg" label={t("fortune")} short={t("short.fortune")} value={String(block.fortune)} />
      <HudStatChip size="lg" label={t("sin")} short={t("short.sin")} value={String(block.sin)} />
      {block.corruption && <HudStatChip size="lg" label={tc("label")} short={tc("short")} value={`${block.corruption.points}/${block.corruption.threshold}`} />}
    </>
  );
}
