"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { getSpellGroupIcon } from "@/lib/utils/spell-icons";
import type { Spell } from "@/lib/api/spells";
import {
  calculateAverageSpellEffect,
  formatSpellAverage,
} from "@/lib/utils/spell-calculations";
import {
  getDamageModifierLabel,
  getHealModifierLabel,
} from "@/lib/constants/spells";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Sparkles } from "lucide-react";

interface SelectedSpellsListProps {
  selectedSpells: Spell[];
  onRemoveSpell: (spellId: string) => void;
}

export function SelectedSpellsList({
  selectedSpells,
  onRemoveSpell,
}: SelectedSpellsListProps) {
  if (selectedSpells.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Магічна Книга порожня. Виберіть заклинання зі списку вище.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Магічна Книга:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {selectedSpells.map((spell) => {
          const averageEffect = calculateAverageSpellEffect(
            spell.diceCount,
            spell.diceType
          );
          const formattedAverage = formatSpellAverage(
            spell.damageType,
            averageEffect
          );

          return (
            <Card key={spell.id} className="relative hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Іконка заклинання */}
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {spell.icon ? (
                      <OptimizedImage
                        src={spell.icon}
                        alt={spell.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        fallback={
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-muted-foreground" />
                          </div>
                        }
                      />
                    ) : (
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Інформація про заклинання */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold truncate">
                        {spell.name}
                      </h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 hover:bg-transparent shrink-0"
                        onClick={() => onRemoveSpell(spell.id)}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Тип заклинання */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {spell.damageType === "damage"
                          ? "Шкода"
                          : spell.damageType === "heal"
                          ? "Лікування"
                          : "Усі"}
                      </Badge>
                      {spell.level !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          Рівень {spell.level === 0 ? "Cantrip" : spell.level}
                        </Badge>
                      )}
                    </div>

                    {/* Середня шкода/лікування */}
                    {formattedAverage && (
                      <p className="text-xs text-muted-foreground">
                        {formattedAverage}
                      </p>
                    )}

                    {/* Модифікатори */}
                    {(spell.damageModifier || spell.healModifier) && (
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {spell.damageModifier && (
                          <Badge variant="outline" className="text-xs">
                            {getDamageModifierLabel(spell.damageModifier)}
                          </Badge>
                        )}
                        {spell.healModifier && (
                          <Badge variant="outline" className="text-xs">
                            {getHealModifierLabel(spell.healModifier)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
