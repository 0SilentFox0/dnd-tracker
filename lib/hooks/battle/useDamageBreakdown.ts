"use client";

import { useQuery } from "@tanstack/react-query";

import {
  type DamageBreakdownRequestBody,
  getDamageBreakdown,
} from "@/lib/api/battles";

export interface DamageBreakdownRequest {
  attackerId: string;
  targetId?: string;
  targetIds?: string[];
  attackId?: string;
  damageRolls: number[];
  isCritical: boolean;
}

export interface TargetBreakdownItem {
  targetId: string;
  targetName: string;
  targetBreakdown: string[];
  finalDamage: number;
}

export interface UseDamageBreakdownParams {
  campaignId: string;
  battleId: string;
  request: DamageBreakdownRequest | null;
  enabled: boolean;
}

export interface UseDamageBreakdownResult {
  breakdown: string[] | null;
  totalDamage: number | null;
  targetBreakdown: string[] | null;
  finalDamage: number | null;
  targetsResult: TargetBreakdownItem[] | null;
  loading: boolean;
  error: string | null;
}

function toRequestBody(
  request: DamageBreakdownRequest,
): DamageBreakdownRequestBody {
  return {
    attackerId: request.attackerId,
    targetId: request.targetId,
    targetIds: request.targetIds,
    attackId: request.attackId,
    damageRolls: request.damageRolls,
    isCritical: request.isCritical,
  };
}

export function useDamageBreakdown({
  campaignId,
  battleId,
  request,
  enabled,
}: UseDamageBreakdownParams): UseDamageBreakdownResult {
  const queryEnabled = Boolean(enabled && request);

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: [
      "damage-breakdown",
      campaignId,
      battleId,
      request?.attackerId,
      request?.targetIds?.join(","),
      request?.targetId,
      request?.attackId,
      request?.damageRolls?.join(","),
      request?.isCritical,
    ],
    queryFn: () => {
      if (!request) throw new Error("Request is required when enabled");

      return getDamageBreakdown(campaignId, battleId, toRequestBody(request));
    },
    enabled: queryEnabled,
    staleTime: 0,
  });

  if (!queryEnabled || !data) {
    return {
      breakdown: null,
      totalDamage: null,
      targetBreakdown: null,
      finalDamage: null,
      targetsResult: null,
      loading: queryEnabled && loading,
      error: queryError ? (queryError as Error).message : null,
    };
  }

  const hasTargets = Array.isArray(data.targets) && data.targets.length > 0;

  const targetsResult: TargetBreakdownItem[] | null = hasTargets
    ? (data.targets as TargetBreakdownItem[])
    : null;

  const targetBreakdown = hasTargets ? null : (data.targetBreakdown ?? null);

  const finalDamage = hasTargets
    ? (data.targets as TargetBreakdownItem[]).reduce(
        (s, t) => s + (t.finalDamage ?? 0),
        0,
      )
    : typeof data.finalDamage === "number"
      ? data.finalDamage
      : data.totalDamage ?? 0;

  return {
    breakdown: data.breakdown ?? [],
    totalDamage: data.totalDamage ?? 0,
    targetBreakdown,
    finalDamage,
    targetsResult,
    loading,
    error: queryError ? (queryError as Error).message : null,
  };
}
