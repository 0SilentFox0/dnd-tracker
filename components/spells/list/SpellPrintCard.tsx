import { Sparkles, Zap } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDamageElementLabel } from "@/lib/constants/damage";
import { spellLevelName, spellLevelRoman } from "@/lib/constants/spells";
import { getDamageModifierLabel, getHealModifierLabel, getSpellDamageTypeLabel, getSpellTargetLabel } from "@/lib/constants/spells";
import { getSpellDamageTypeIcon, getSpellGroupIcon, getSpellTypeIcon } from "@/lib/utils/spells/spell-icons";
import type { Spell } from "@/types/spells";

export function SpellPrintCard({ spell }: { spell: Spell }) {
  const SpellGroupIcon = getSpellGroupIcon(spell.spellGroup?.name || "Без групи");

  const TypeIcon = getSpellTypeIcon(spell.type);

  const DamageTypeIcon = getSpellDamageTypeIcon(spell.damageType);

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative bg-muted">
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
              <CardTitle className="text-sm sm:text-base truncate flex-1 min-w-0">{spell.name}</CardTitle>
              <Badge variant={spell.level === 0 ? "secondary" : "default"} className="flex items-center gap-1 shrink-0 text-xs">
                <Sparkles className="h-3 w-3" />
                <span className="hidden sm:inline">{spellLevelName(spell.level)}</span>
                <span className="sm:hidden">{spellLevelRoman(spell.level)}</span>
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
            <span className="hidden sm:inline">{spell.spellGroup?.name || "Без групи"}</span>
            <span className="sm:hidden truncate max-w-[60px]">{spell.spellGroup?.name?.[0] || "-"}</span>
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
                <span className="hidden sm:inline">{spell.type === "target" ? "Цільове" : "AoE"}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <DamageTypeIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{getSpellDamageTypeLabel(spell.damageType)}</span>
              </Badge>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="text-xs sm:text-sm text-muted-foreground flex-1">
          {Array.isArray(spell.effects) && spell.effects.length > 0 ? (
            <ul className="list-disc list-inside space-y-0.5">
              {spell.effects.map((effect, i) => (
                <li key={i}>{effect}</li>
              ))}
            </ul>
          ) : spell.description ? (
            <p>{spell.description}</p>
          ) : null}
        </div>
        {spell.diceCount && spell.diceType && (
          <div className="text-xs sm:text-sm mt-2 font-medium">
            Шкода: {spell.diceCount}{spell.diceType}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
