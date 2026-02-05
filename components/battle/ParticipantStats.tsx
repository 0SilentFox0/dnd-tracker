import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

interface ParticipantStatsProps {
  participant: BattleParticipant;
  className?: string;
  compact?: boolean;
}

export function ParticipantStats({
  participant,
  className,
  compact = false,
}: ParticipantStatsProps) {
  const { combatStats, abilities } = participant;

  const stats = [
    { label: "STR", value: abilities.strength },
    { label: "DEX", value: abilities.dexterity },
    { label: "CON", value: abilities.constitution },
    { label: "INT", value: abilities.intelligence },
    { label: "WIS", value: abilities.wisdom },
    { label: "CHA", value: abilities.charisma },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]",
        className,
      )}
    >
      {/* AC */}
      <div className="flex items-center gap-1 font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">
        <Shield className="w-3 h-3" />
        <span>{combatStats.armorClass}</span>
      </div>

      {/* Ability Scores */}
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-1 opacity-70">
          <span className="font-black uppercase tracking-tighter text-muted-foreground">
            {stat.label}
          </span>
          <span className="font-bold text-white">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
