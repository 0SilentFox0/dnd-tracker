"use client";

import { useTranslations } from "next-intl";

import { DM_ACTOR, SYSTEM_ACTOR } from "@/lib/constants/battle";

export function useServiceActorName(): (actorId: string) => string | null {
  const t = useTranslations("battleCommon.actors");

  return (actorId) => (actorId === SYSTEM_ACTOR.actorId ? t("system") : actorId === DM_ACTOR.actorId ? t("dm") : null);
}
