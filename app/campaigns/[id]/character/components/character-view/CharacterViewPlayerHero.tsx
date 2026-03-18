"use client";

import {
  Crown,
  Heart,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

function StatCard({
  icon,
  label,
  value,
  color,
  animate = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  animate?: boolean;
}) {
  return (
    <div className={`relative group ${animate ? "animate-pulse-slow" : ""}`}>
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r ${color} rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300`}
      />
      <div className="relative flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-card/90 backdrop-blur-sm p-3 sm:p-4 shadow-lg">
        <div className={`text-white bg-gradient-to-r ${color} p-2 rounded-lg`}>
          {icon}
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

function AbilityBadge({
  label,
  score,
  modifier,
}: {
  label: string;
  score: number;
  modifier: number;
}) {
  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-chart-2 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-300" />
      <div className="relative flex flex-col items-center gap-1 rounded-lg border border-primary/30 bg-card/80 backdrop-blur-sm p-2 sm:p-3 shadow-md hover:shadow-lg transition-all">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          {label}
        </span>
        <span className="text-2xl sm:text-3xl font-bold tabular-nums">
          {score}
        </span>
        <span
          className={`text-xs font-semibold tabular-nums ${modifier >= 0 ? "text-green-500" : "text-red-500"}`}
        >
          {modifier >= 0 ? "+" : ""}
          {modifier}
        </span>
      </div>
    </div>
  );
}

export interface CharacterViewPlayerHeroProps {
  basicInfo: {
    name: string;
    level: number;
    class?: string;
    race?: string;
    background?: string;
    subclass?: string;
    avatar?: string | null;
  };
  combatStats: { armorClass: number; initiative: number; speed: number };
  heroHp: { total: number };
  abilityScores: Record<
    "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma",
    number
 >;
  abilityMods: Record<
    "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma",
    number
  >;
}

export function CharacterViewPlayerHero({
  basicInfo,
  combatStats,
  heroHp,
  abilityScores,
  abilityMods,
}: CharacterViewPlayerHeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-primary/20 via-background/95 to-background border-b border-primary/20">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] animate-[shimmer_3s_ease-in-out_infinite]" />
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 relative">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-chart-2 to-primary rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
            <div className="relative h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-2xl">
              {basicInfo.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={basicInfo.avatar}
                  alt={basicInfo.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-primary">
                  {basicInfo.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-2 shadow-lg border-2 border-background">
              <span className="text-sm font-bold text-primary-foreground">
                {basicInfo.level}
              </span>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <Crown className="h-5 w-5 text-primary animate-pulse" />
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
                {basicInfo.name}
              </h1>
            </div>
            <p className="text-base sm:text-lg text-muted-foreground mb-3">
              {[
                basicInfo.class &&
                  `${basicInfo.class} ${basicInfo.level} рівня`,
                basicInfo.race,
                basicInfo.background,
              ]
                .filter(Boolean)
                .join(" • ")}
            </p>
            {basicInfo.subclass && (
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                <Sparkles className="h-4 w-4" />
                {basicInfo.subclass}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Heart className="h-5 w-5" />}
            label="Здоров'я"
            value={heroHp.total}
            color="from-red-500 to-rose-600"
            animate
          />
          <StatCard
            icon={<Shield className="h-5 w-5" />}
            label="Клас Броні"
            value={combatStats.armorClass}
            color="from-blue-500 to-cyan-600"
          />
          <StatCard
            icon={<Zap className="h-5 w-5" />}
            label="Ініціатива"
            value={
              combatStats.initiative >= 0
                ? `+${combatStats.initiative}`
                : combatStats.initiative
            }
            color="from-yellow-500 to-amber-600"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Швидкість"
            value={`${combatStats.speed} фт`}
            color="from-green-500 to-emerald-600"
          />
        </div>

        <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          <AbilityBadge
            label="СИЛ"
            score={abilityScores.strength}
            modifier={abilityMods.strength}
          />
          <AbilityBadge
            label="ЛОВ"
            score={abilityScores.dexterity}
            modifier={abilityMods.dexterity}
          />
          <AbilityBadge
            label="ВИТ"
            score={abilityScores.constitution}
            modifier={abilityMods.constitution}
          />
          <AbilityBadge
            label="ІНТ"
            score={abilityScores.intelligence}
            modifier={abilityMods.intelligence}
          />
          <AbilityBadge
            label="МУД"
            score={abilityScores.wisdom}
            modifier={abilityMods.wisdom}
          />
          <AbilityBadge
            label="ХАР"
            score={abilityScores.charisma}
            modifier={abilityMods.charisma}
          />
        </div>
      </div>
    </div>
  );
}
