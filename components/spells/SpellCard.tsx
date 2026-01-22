"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, X, Move, Zap } from "lucide-react";
import type { Spell, SpellGroup } from "@/types/spells";
import {
  getSpellGroupIcon,
  getSpellTypeIcon,
  getSpellDamageTypeIcon,
} from "@/lib/utils/spell-icons";
import { getDamageModifierLabel, getHealModifierLabel, getSpellTargetLabel } from "@/lib/constants/spells";
import { getDamageElementLabel } from "@/lib/constants/damage";
import { OptimizedImage } from "@/components/common/OptimizedImage";

interface SpellCardProps {
  spell: Spell;
  campaignId: string;
  spellGroups: SpellGroup[];
  onRemoveFromGroup: (spellId: string) => void;
  onMoveToGroup: (spellId: string, groupId: string | null) => void;
}


export function SpellCard({
  spell,
  campaignId,
  spellGroups,
  onRemoveFromGroup,
  onMoveToGroup,
}: SpellCardProps) {
  // These are references to existing lucide-react components, not new component instances
  const SpellGroupIcon = useMemo(
    () => getSpellGroupIcon(spell.spellGroup?.name || "Без групи"),
    [spell.spellGroup?.name]
  );
  const TypeIcon = useMemo(() => getSpellTypeIcon(spell.type), [spell.type]);
  const DamageTypeIcon = useMemo(
    () => getSpellDamageTypeIcon(spell.damageType),
    [spell.damageType]
  );

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 relative">
            {spell.icon ? (
              <OptimizedImage
                src={spell.icon}
                alt={spell.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                fallback={
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                    <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                }
              />
            ) : (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <CardTitle className="text-sm sm:text-base truncate flex-1 min-w-0">
                {spell.name}
              </CardTitle>
              <Badge
                variant={spell.level === 0 ? "secondary" : "default"}
                className="flex items-center gap-1 shrink-0 text-xs"
              >
                {spell.level === 0 ? (
                  <>
                    <Sparkles className="h-3 w-3" />
                    <span className="hidden sm:inline">Cantrip</span>
                    <span className="sm:hidden">C</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    <span className="hidden sm:inline">{spell.level}</span>
                    <span className="sm:hidden">{spell.level}</span>
                  </>
                )}
              </Badge>
            </div>
            {spell.damageElement && (
              <Badge variant="outline" className="mt-2 text-xs">
                {getDamageElementLabel(spell.damageElement)}
              </Badge>
            )}
            {spell.damageModifier && (
              <Badge variant="outline" className="mt-2 text-xs">
                {getDamageModifierLabel(spell.damageModifier)}
              </Badge>
            )}
            {spell.healModifier && (
              <Badge variant="outline" className="mt-2 text-xs">
                {getHealModifierLabel(spell.healModifier)}
              </Badge>
            )}
            {spell.target && (
              <Badge variant="outline" className="mt-2 text-xs">
                {getSpellTargetLabel(spell.target)}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="flex flex-wrap gap-1 sm:gap-2 mt-2">
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <SpellGroupIcon className="h-3 w-3" />
            <span className="hidden sm:inline">
              {spell.spellGroup?.name || "Без групи"}
            </span>
            <span className="sm:hidden truncate max-w-[60px]">
              {spell.spellGroup?.name?.[0] || "-"}
            </span>
          </Badge>
          {spell.type === "aoe" && spell.damageType === "damage" ? (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Zap className="h-3 w-3" />
              <span className="hidden sm:inline">AOE Демедж</span>
              <span className="sm:hidden">AOE</span>
            </Badge>
          ) : (
            <>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <TypeIcon className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {spell.type === "target" ? "Цільове" : "AoE"}
                </span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <DamageTypeIcon className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {spell.damageType === "damage"
                    ? "Шкода"
                    : spell.damageType === "heal"
                    ? "Лікування"
                    : spell.damageType === "buff"
                    ? "Баф"
                    : spell.damageType === "debuff"
                    ? "Дебаф"
                    : spell.damageType}
                </span>
              </Badge>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 flex-1">
          {spell.description}
        </p>
        <div className="flex gap-1 sm:gap-2 mt-2 sm:mt-3">
          <Link
            href={`/campaigns/${campaignId}/dm/spells/${spell.id}`}
            className="flex-1 min-w-0"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs sm:text-sm"
            >
              Редагувати
            </Button>
          </Link>
          {spell.spellGroup && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => onRemoveFromGroup(spell.id)}
              title="Видалити з групи"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                title="Перемістити в групу"
              >
                <Move className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => onMoveToGroup(spell.id, null)}
              >
                Без групи
              </DropdownMenuItem>
              {spellGroups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  onClick={() => onMoveToGroup(spell.id, group.id)}
                >
                  {group.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
