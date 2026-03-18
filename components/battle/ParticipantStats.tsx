import { Shield, Sparkles } from "lucide-react";

import { getEffectiveArmorClass } from "@/lib/utils/battle/battle-participant-helpers";
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

  const baseAC = combatStats.armorClass;

  const effectiveAC = getEffectiveArmorClass(participant);

  const acChanged = effectiveAC !== baseAC;

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
      <div
        className={cn(
          "flex items-center gap-1 font-bold bg-white/10 px-1.5 py-0.5 rounded",
          acChanged
            ? effectiveAC < baseAC
              ? "text-red-400"
              : "text-green-400"
            : "text-white",
        )}
      >
        <Shield className="w-3 h-3" />
        <span>
          {acChanged ? `${effectiveAC} (${baseAC})` : effectiveAC}
        </span>
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

      {/* Магічні слоти: рівень(●●○) — заповнені = доступні, пусті = використані */}
      {Object.keys(spellSlots).length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5 tabular-nums"
          title="Магічні слоти"
        >
          <Sparkles className="w-3 h-3 text-amber-400/80 shrink-0" />
          {Object.entries(spellSlots)
            .sort(([a], [b]) =>
              a === "universal" ? -1 : b === "universal" ? 1 : Number(a) - Number(b),
            )
            .map(([level, slot]) => {
              const x = level === "universal" ? "У" : level;

              const filled = "●".repeat(slot.current);

              const empty = "○".repeat(Math.max(0, slot.max - slot.current));

              return (
                <span
                  key={level}
                  className="text-amber-200/90"
                  aria-label={`Рівень ${level}: ${slot.current}/${slot.max}`}
                  title={
                    level === "universal"
                      ? `Універсальні: ${slot.current}/${slot.max}`
                      : `Рівень ${level}: ${slot.current}/${slot.max}`
                  }
                >
                  {x}({filled}{empty})
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
}
