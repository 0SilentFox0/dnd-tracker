"use client";

import { useEffect,useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

interface Spell {
  id: string;
  name: string;
  level: number;
  type: "target" | "aoe";
  damageType: "damage" | "heal" | "all";
  diceCount?: number | null;
  diceType?: string | null;
  savingThrow?: {
    ability: string;
    onSuccess: "half" | "none";
  } | null;
  description?: string;
}

interface SpellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caster: BattleParticipant | null;
  battle: BattleScene | null;
  campaignId: string;
  availableTargets: BattleParticipant[];
  isDM: boolean;
  canSeeEnemyHp: boolean;
  onCast: (data: {
    casterId: string;
    casterType: string;
    spellId: string;
    targetIds: string[];
    damageRolls: number[];
    savingThrows?: Array<{ participantId: string; roll: number }>;
    additionalRollResult?: number;
  }) => void;
}

export function SpellDialog({
  open,
  onOpenChange,
  caster,
  battle,
  campaignId,
  availableTargets,
  isDM,
  canSeeEnemyHp,
  onCast,
}: SpellDialogProps) {
  const [selectedSpellId, setSelectedSpellId] = useState<string>("");

  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const [savingThrows, setSavingThrows] = useState<Record<string, { roll: number; ability: string }>>({});

  const [damageRolls, setDamageRolls] = useState<string[]>([]);

  const [additionalRoll, setAdditionalRoll] = useState("");

  const [spells, setSpells] = useState<Spell[]>([]);

  // Завантажуємо деталі заклинань
  useEffect(() => {
    if (!caster || !open || !campaignId) return;

    const loadSpells = async () => {
      try {
        const knownSpellIds = caster.spellcasting.knownSpells || [];

        if (knownSpellIds.length === 0) {
          setSpells([]);

          return;
        }

        const response = await fetch(`/api/campaigns/${campaignId}/spells`);

        if (!response.ok) {
          setSpells([]);

          return;
        }

        const allSpells: Spell[] = await response.json();

        const knownSpells = allSpells.filter((spell: Spell) =>
          knownSpellIds.includes(spell.id)
        );

        setSpells(knownSpells);
      } catch (error) {
        console.error("Error loading spells:", error);
        setSpells([]);
      }
    };

    loadSpells();
  }, [caster, campaignId, open]);

  if (!caster || !battle) {
    return null;
  }

  const spellSlots = caster.spellcasting.spellSlots || {};

  const selectedSpell = spells.find(s => s.id === selectedSpellId);

  // Парсимо diceType для визначення кількості кубиків
  const parseDiceType = (diceType: string | null | undefined): number => {
    if (!diceType) return 6;

    const match = diceType.match(/d(\d+)/);

    return match ? parseInt(match[1]) : 6;
  };

  const diceTypeValue = selectedSpell?.diceType ? parseDiceType(selectedSpell.diceType) : 6;

  const diceCount = selectedSpell?.diceCount || 1;

  const handleCast = () => {
    if (!selectedSpellId || selectedTargets.length === 0) return;

    // Збираємо saving throws якщо потрібні
    const savingThrowsArray = Object.entries(savingThrows)
      .filter(([, data]) => data.roll > 0)
      .map(([targetId, data]) => ({
        participantId: targetId,
        roll: data.roll,
      }));

    onCast({
      casterId: caster.basicInfo.id,
      casterType: caster.basicInfo.sourceType,
      spellId: selectedSpellId,
      targetIds: selectedTargets,
      damageRolls: damageRolls.map((r) => parseInt(r)).filter((n) => !isNaN(n)),
      savingThrows: savingThrowsArray.length > 0 ? savingThrowsArray : undefined,
      additionalRollResult: additionalRoll ? parseInt(additionalRoll) : undefined,
    });

    // Скидаємо форму
    setSelectedSpellId("");
    setSelectedTargets([]);
    setSavingThrows({});
    setDamageRolls([]);
    setAdditionalRoll("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedSpellId("");
      setSelectedTargets([]);
      setSavingThrows({});
      setDamageRolls([]);
      setAdditionalRoll("");
    }

    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✨ Заклинання</DialogTitle>
          <DialogDescription>
            {caster.basicInfo.name} кастує заклинання
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Показ spell slots */}
          <div>
            <Label>Доступні Spell Slots</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(spellSlots).map(([level, slot]) => (
                <Badge key={level} variant={slot.current > 0 ? "default" : "outline"}>
                  Level {level}: {slot.current}/{slot.max}
                </Badge>
              ))}
            </div>
          </div>

          {/* Вибір заклинання */}
          <div>
            <Label>Заклинання</Label>
            <SelectField
              value={selectedSpellId}
              onValueChange={setSelectedSpellId}
              placeholder="Оберіть заклинання"
              options={spells.map(spell => {
                const slot = spellSlots[spell.level.toString()];

                const isAvailable = slot && slot.current > 0;

                return {
                  value: spell.id,
                  label: `${spell.name} (Level ${spell.level}) ${spell.type === "aoe" ? "AOE" : "Target"}${!isAvailable ? " - Немає slots" : ""}`,
                  disabled: !isAvailable,
                };
              })}
            />
            {selectedSpell && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedSpell.description}
              </p>
            )}
          </div>

          {/* Вибір цілей (поки що одна ціль, потім AOE) */}
          <div>
            <Label>Цілі</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableTargets.map((target) => (
                <div key={target.basicInfo.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTargets.includes(target.basicInfo.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTargets([...selectedTargets, target.basicInfo.id]);
                      } else {
                        setSelectedTargets(selectedTargets.filter(id => id !== target.basicInfo.id));

                        // Видаляємо saving throw для цієї цілі
                        const newSavingThrows = { ...savingThrows };

                        delete newSavingThrows[target.basicInfo.id];
                        setSavingThrows(newSavingThrows);
                      }
                    }}
                  />
                  <label className="flex-1 text-sm">
                    {target.basicInfo.name}
                    {(isDM || canSeeEnemyHp || target.basicInfo.side === "ally") && (
                      <span className="text-muted-foreground ml-2">
                        (HP: {target.combatStats.currentHp}/{target.combatStats.maxHp})
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Damage Rolls */}
          {selectedSpell && selectedSpell.damageType !== "heal" && diceCount > 0 && (
            <div>
              <Label>Кубики урону ({diceCount}{selectedSpell.diceType || "d6"})</Label>
              <div className="space-y-2">
                {Array.from({ length: diceCount }).map((_, index) => (
                  <Input
                    key={index}
                    type="number"
                    min="1"
                    max={diceTypeValue}
                    value={damageRolls[index] || ""}
                    onChange={(e) => {
                      const newRolls = [...damageRolls];

                      newRolls[index] = e.target.value;
                      setDamageRolls(newRolls);
                    }}
                    placeholder={`Кубик ${index + 1} (1-${diceTypeValue})`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Healing Rolls */}
          {selectedSpell && selectedSpell.damageType === "heal" && diceCount > 0 && (
            <div>
              <Label>Кубики лікування ({diceCount}{selectedSpell.diceType || "d6"})</Label>
              <div className="space-y-2">
                {Array.from({ length: diceCount }).map((_, index) => (
                  <Input
                    key={index}
                    type="number"
                    min="1"
                    max={diceTypeValue}
                    value={damageRolls[index] || ""}
                    onChange={(e) => {
                      const newRolls = [...damageRolls];

                      newRolls[index] = e.target.value;
                      setDamageRolls(newRolls);
                    }}
                    placeholder={`Кубик ${index + 1} (1-${diceTypeValue})`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Saving Throws (якщо заклинання вимагає) */}
          {selectedTargets.length > 0 && selectedSpell?.savingThrow && (
            <div>
              <Label>Saving Throws ({selectedSpell.savingThrow.ability.toUpperCase()})</Label>
              <div className="space-y-2">
                {selectedTargets.map((targetId) => {
                  const target = availableTargets.find(t => t.basicInfo.id === targetId);

                  if (!target) return null;
                  
                  return (
                    <div key={targetId} className="space-y-1">
                      <Label className="text-xs">{target.basicInfo.name}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={savingThrows[targetId]?.roll || ""}
                        onChange={(e) => {
                          setSavingThrows({
                            ...savingThrows,
                            [targetId]: {
                              ability: selectedSpell.savingThrow?.ability ?? "unknown",
                              roll: parseInt(e.target.value) || 0,
                            },
                          });
                        }}
                        placeholder="1d20"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            onClick={handleCast}
            disabled={!selectedSpellId || selectedTargets.length === 0}
            className="w-full"
          >
            Застосувати заклинання
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
