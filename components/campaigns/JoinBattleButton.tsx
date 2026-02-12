"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import { getActiveBattles } from "@/lib/api/campaigns";
import { Button } from "@/components/ui/button";

/**
 * Кнопка Join Battle з автоматичним оновленням при зміні активних боїв.
 * Використовує polling (refetchInterval) та refetchOnWindowFocus,
 * щоб активуватися без перезавантаження сторінки.
 */
export function JoinBattleButton() {
  const { data: activeBattles = [], isLoading } = useQuery({
    queryKey: ["active-battles"],
    queryFn: getActiveBattles,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const hasActiveBattle = activeBattles.length > 0;
  const firstBattle = activeBattles[0];

  return (
    <div className="flex justify-center">
      <Link
        href={
          hasActiveBattle && firstBattle
            ? `/campaigns/${firstBattle.campaignId}/battles/${firstBattle.id}`
            : "#"
        }
      >
        <Button
          size="lg"
          className={
            hasActiveBattle
              ? "animate-pulse bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }
          disabled={!hasActiveBattle || isLoading}
        >
          {isLoading
            ? "⚔️ Завантаження..."
            : hasActiveBattle
              ? "⚔️ JOIN BATTLE"
              : "⚔️ JOIN BATTLE (Немає активних боїв)"}
        </Button>
      </Link>
    </div>
  );
}
