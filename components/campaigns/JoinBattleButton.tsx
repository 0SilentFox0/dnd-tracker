"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useActiveBattles } from "@/lib/hooks/campaigns";

export function JoinBattleButton() {
  const { data: activeBattles = [], isLoading } = useActiveBattles();

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
          variant={hasActiveBattle ? "default" : "outline"}
          className={hasActiveBattle ? "animate-pulse" : "cursor-not-allowed"}
          disabled={!hasActiveBattle || isLoading}
        >
          {isLoading ? "⚔️ Завантаження..." : "⚔️ JOIN BATTLE"}
        </Button>
      </Link>
    </div>
  );
}
