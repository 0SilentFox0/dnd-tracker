"use client";

import { Swords } from "lucide-react";

import { HeaderPillLink } from "@/components/campaigns/HeaderPillLink";
import { useJoinBattle } from "@/lib/hooks/campaigns";

export function JoinBattleButton() {
  const { href } = useJoinBattle();

  return href ? <HeaderPillLink href={href} icon={Swords} label="JOIN BATTLE" srLabel="Join Battle" /> : null;
}
