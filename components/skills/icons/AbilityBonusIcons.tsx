"use client";

import {
  Brain,
  Dumbbell,
  Eye,
  Heart,
  Shield,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface AbilityBonusIconsProps {
  bonuses: Record<string, number>;
  className?: string;
}

const abilityIcons = {
  strength: Dumbbell,
  dexterity: Zap,
  constitution: Heart,
  intelligence: Brain,
  wisdom: Eye,
  charisma: Sparkles,
};

const abilityLabels: Record<string, string> = {
  strength: "Сила",
  dexterity: "Спритність",
  constitution: "Тіло",
  intelligence: "Інтелект",
  wisdom: "Мудрість",
  charisma: "Харизма",
};

export function AbilityBonusIcons({
  bonuses,
  className = "",
}: AbilityBonusIconsProps) {
  const bonusEntries = Object.entries(bonuses).filter(([, value]) => value !== 0);

  if (bonusEntries.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 items-center ${className}`}>
      {bonusEntries.map(([attr, value]) => {
        const Icon = abilityIcons[attr as keyof typeof abilityIcons];

        if (!Icon) return null;

        const isPositive = value > 0;

        return (
          <Badge
            key={attr}
            variant="secondary"
            className="flex items-center gap-1 text-xs px-2 py-0.5"
            title={`${abilityLabels[attr] || attr}: ${isPositive ? "+" : ""}${value}`}
          >
            <Icon className="h-3 w-3" />
            <span className={isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {isPositive ? "+" : ""}{value}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}

interface SkillStatsIconsProps {
  armor?: number | null;
  physicalResistance?: number | null;
  magicalResistance?: number | null;
  damage?: number | null;
  speed?: number | null;
  className?: string;
}

export function SkillStatsIcons({
  armor,
  physicalResistance,
  magicalResistance,
  className = "",
}: SkillStatsIconsProps) {
  const stats = [];

  if (armor !== null && armor !== undefined) {
    stats.push({
      icon: Shield,
      label: "Броня",
      value: armor,
      color: "text-blue-600 dark:text-blue-400",
    });
  }

  if (physicalResistance !== null && physicalResistance !== undefined) {
    stats.push({
      icon: ShieldCheck,
      label: "Резист фізичний",
      value: physicalResistance,
      color: "text-orange-600 dark:text-orange-400",
    });
  }

  if (magicalResistance !== null && magicalResistance !== undefined) {
    stats.push({
      icon: ShieldOff,
      label: "Резист магічний",
      value: magicalResistance,
      color: "text-purple-600 dark:text-purple-400",
    });
  }

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 items-center ${className}`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 text-xs px-2 py-0.5"
            title={`${stat.label}: ${stat.value}`}
          >
            <Icon className={`h-3 w-3 ${stat.color}`} />
            <span className={stat.color}>{stat.value}</span>
          </Badge>
        );
      })}
    </div>
  );
}
