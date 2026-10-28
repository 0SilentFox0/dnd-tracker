"use client";

import { useMemo } from "react";

import { useClasses } from "./useClasses";

import { useCampaignRules } from "@/lib/hooks/campaigns";
import { classesById } from "@/lib/utils/characters/classes";
import type { GameClassData } from "@/types/classes";

const NO_CLASSES: GameClassData[] = [];

export function useClassMode(campaignId: string) {
  const rules = useCampaignRules(campaignId);

  const enabled = !!rules.data?.classes.enabled;

  const { data: classes = NO_CLASSES, isPending } = useClasses(campaignId, { enabled });

  const byId = useMemo(() => classesById(classes), [classes]);

  return { enabled, classes, byId, pending: rules.isPending || (enabled && isPending) };
}
