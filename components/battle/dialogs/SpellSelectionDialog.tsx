"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpellDamageType, SpellType } from "@/lib/constants/spell-abilities";
import type { BattleParticipant } from "@/types/battle";
import type { Spell } from "@/types/battle-ui";

interface SpellSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caster: BattleParticipant;
  campaignId: string;
  onSelect: (spell: Spell) => void;
}

/**
 * Діалог вибору заклинання
 */
export function SpellSelectionDialog({
  open,
  onOpenChange,
  caster,
  campaignId,
  onSelect,
}: SpellSelectionDialogProps) {
  const [spells, setSpells] = useState<Spell[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!caster || !open || !campaignId) return;

    const loadSpells = async () => {
      setLoading(true);
      try {
        const knownSpellIds = caster.spellcasting.knownSpells || [];

        if (knownSpellIds.length === 0) {
          setSpells([]);
          setLoading(false);

          return;
        }

        const response = await fetch(`/api/campaigns/${campaignId}/spells`);

        if (!response.ok) {
          setSpells([]);
          setLoading(false);

          return;
        }

        const allSpells: Array<{
          id: string;
          name: string;
          level: number;
          type: string;
          damageType: string;
          description?: string;
        }> = await response.json();

        // Конвертуємо рядкові значення в enum
        const knownSpells: Spell[] = allSpells
          .filter((spell) => knownSpellIds.includes(spell.id))
          .map((spell) => ({
            id: spell.id,
            name: spell.name,
            level: spell.level,
            type: spell.type === "aoe" ? SpellType.AOE : SpellType.TARGET,
            damageType: spell.damageType === "heal" 
              ? SpellDamageType.HEAL 
              : spell.damageType === "all"
              ? SpellDamageType.ALL
              : SpellDamageType.DAMAGE,
            description: spell.description,
          }));

        setSpells(knownSpells);
      } catch (error) {
        console.error("Error loading spells:", error);
        setSpells([]);
      } finally {
        setLoading(false);
      }
    };

    loadSpells();
  }, [caster, campaignId, open]);

  const spellSlots = caster.spellcasting.spellSlots || {};

  const getAvailableSlots = (level: number): number => {
    const slot = spellSlots[level.toString()];

    return slot ? slot.current : 0;
  };

  const handleSelectSpell = (spell: Spell) => {
    const availableSlots = getAvailableSlots(spell.level);

    if (availableSlots <= 0) {
      alert(`Немає доступних spell slots рівня ${spell.level}`);

      return;
    }

    onSelect(spell);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>✨ Книга Заклинань</DialogTitle>
          <DialogDescription>
            Оберіть заклинання для касту
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <p className="text-center py-4">Завантаження...</p>
          ) : spells.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Немає доступних заклинань
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {spells.map((spell) => {
                const availableSlots = getAvailableSlots(spell.level);

                const canCast = availableSlots > 0;

                return (
                  <Button
                    key={spell.id}
                    variant={canCast ? "outline" : "ghost"}
                    disabled={!canCast}
                    onClick={() => handleSelectSpell(spell)}
                    className="w-full justify-start h-auto p-3"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{spell.name}</span>
                          <Badge variant="secondary">Рівень {spell.level}</Badge>
                          <Badge variant={spell.type === SpellType.AOE ? "default" : "outline"}>
                            {spell.type === SpellType.AOE ? "AOE" : "Ціль"}
                          </Badge>
                        </div>
                        {spell.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {spell.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <span className={canCast ? "text-foreground" : "text-muted-foreground"}>
                            {availableSlots} / {spellSlots[spell.level.toString()]?.max || 0}
                          </span>
                        </div>
                        {!canCast && (
                          <span className="text-xs text-destructive">Немає slots</span>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
