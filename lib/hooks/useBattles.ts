import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBattle, nextTurn, attack, moraleCheck, castSpell } from "@/lib/api/battles";
import type { BattleScene, AttackData, MoraleCheckData, SpellCastData } from "@/types/api";

export function useBattle(campaignId: string, battleId: string) {
  return useQuery<BattleScene>({
    queryKey: ["battle", campaignId, battleId],
    queryFn: () => getBattle(campaignId, battleId),
  });
}

export function useNextTurn(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => nextTurn(campaignId, battleId),
    onSuccess: (data) => {
      // Оновлюємо дані бою
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        data
      );
    },
  });
}

export function useAttack(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AttackData) => attack(campaignId, battleId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        data
      );
    },
  });
}

export function useMoraleCheck(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MoraleCheckData) => moraleCheck(campaignId, battleId, data),
    onSuccess: (result) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        result.battle
      );
    },
  });
}

export function useCastSpell(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SpellCastData) => castSpell(campaignId, battleId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        data
      );
    },
  });
}
