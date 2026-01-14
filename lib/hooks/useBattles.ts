import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBattle, nextTurn, attack, type BattleScene, type AttackData } from "@/lib/api/battles";

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
