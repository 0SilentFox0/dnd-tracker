import { Shield, Sparkles } from "lucide-react";

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
}: ParticipantStatsProps) {
  const { combatStats, abilities, spellcasting } = participant;

  const spellSlots = spellcasting?.spellSlots ?? {};

  const morale = combatStats.morale ?? 0;

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

      {/* Мораль */}
      <div className="flex items-center gap-1 opacity-70" title="Мораль">
        <span className="font-black uppercase tracking-tighter text-muted-foreground">
          МOR
        </span>
        <span
          className={cn(
            "font-bold",
            morale > 0 ? "text-green-400" : "text-red-400",
          )}
        >
          {morale > 0 ? "+" : ""}
          {morale}
        </span>
      </div>

      {/* Магічні слоти: заповнені (доступні) і пусті (використані) */}
      {Object.keys(spellSlots).length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          title="Магічні слоти"
        >
          <Sparkles className="w-3 h-3 text-amber-400/80 shrink-0" />
          {Object.entries(spellSlots)
            .sort(([a], [b]) =>
              a === "universal" ? -1 : b === "universal" ? 1 : Number(a) - Number(b),
            )
            .map(([level, slot]) => {
              const filled = slot.current;
              const empty = Math.max(0, slot.max - slot.current);
              const label = level === "universal" ? "Унів." : `Рів.${level}`;

              return (
                <div
                  key={level}
                  className="flex items-center gap-0.5"
                  aria-label={`${label}: ${filled}/${slot.max}`}
                  title={level === "universal" ? "Універсальні слоти (будь-яке заклинання)" : `Рівень ${level}`}
                >
                  {Array.from({ length: filled }).map((_, i) => (
                    <span
                      key={`f-${level}-${i}`}
                      className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                    />
                  ))}
                  {Array.from({ length: empty }).map((_, i) => (
                    <span
                      key={`e-${level}-${i}`}
                      className="inline-block h-1.5 w-1.5 rounded-full border border-amber-400/50 bg-transparent"
                    />
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
