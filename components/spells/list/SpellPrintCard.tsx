import { Sparkles } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { spellLevelName, spellLevelRoman } from "@/lib/constants/spells";
import { spellMechanicsLabels } from "@/lib/utils/spells/model/summary";
import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";
import type { Spell } from "@/types/spells";

export function SpellPrintCard({ spell }: { spell: Spell }) {
  const SpellGroupIcon = getSpellGroupIcon(spell.spellGroup?.name || "Без групи");

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
          </div>
        </div>
        <CardDescription className="flex flex-wrap gap-1 sm:gap-2 mt-2">
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <SpellGroupIcon className="h-3 w-3" />
            <span className="hidden sm:inline">{spell.spellGroup?.name || "Без групи"}</span>
            <span className="sm:hidden truncate max-w-[60px]">{spell.spellGroup?.name?.[0] || "-"}</span>
          </Badge>
          {spellMechanicsLabels(spell).map((label) => (
            <Badge key={label} variant="outline" className="text-xs">
              {label}
            </Badge>
          ))}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="text-xs sm:text-sm text-muted-foreground flex-1">{spell.description && <p>{spell.description}</p>}</div>
      </CardContent>
    </Card>
  );
}
