"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getSpellTypeIcon } from "@/lib/utils/spells/spell-icons";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export type SpellTargetType = "target" | "aoe" | "no_target";

interface Spell {
  id: string;
  name: string;
  level: number;
  type: SpellTargetType;
  damageType: "damage" | "heal" | "all";
  diceCount?: number | null;
  diceType?: string | null;
  savingThrow?: {
    ability: string;
    onSuccess: "half" | "none";
    dc?: number;
  } | null;
  hitCheck?: { ability: string; dc: number } | null;
  description?: string;
  spellGroup?: { id: string; name: string } | null;
  icon?: string | null;
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
    hitRoll?: number;
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

  const [spellIconError, setSpellIconError] = useState(false);

  const [savingThrows, setSavingThrows] = useState<
    Record<string, { roll: number; ability: string }>
  >({});

  const [damageRolls, setDamageRolls] = useState<string[]>([]);

  const [additionalRoll, setAdditionalRoll] = useState("");

  const [hitRoll, setHitRoll] = useState("");

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
          knownSpellIds.includes(spell.id),
        );

        setSpells(knownSpells);
      } catch (error) {
        console.error("Error loading spells:", error);
        setSpells([]);
      }
    };

    loadSpells();
  }, [caster, campaignId, open]);

  const spellsByGroup = useMemo(() => {
    const map = new Map<string, Spell[]>();

    spells.forEach((spell) => {
      const groupName = spell.spellGroup?.name ?? "Без групи";

      if (!map.has(groupName)) map.set(groupName, []);

      const group = map.get(groupName);

      if (group) group.push(spell);
    });

    map.forEach((groupSpells) => {
      groupSpells.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;

        return a.name.localeCompare(b.name);
      });
    });

    return map;
  }, [spells]);

  if (!caster || !battle) {
    return null;
  }

  const spellSlots = caster.spellcasting.spellSlots || {};

  const selectedSpell = spells.find((s) => s.id === selectedSpellId);

  // Для "target" — лише одна ціль; при зміні типу заклинання обмежуємо вибір
  const handleTargetToggle = (targetId: string, checked: boolean) => {
    if (!selectedSpell) return;

    if (selectedSpell.type === "target") {
      setSelectedTargets(checked ? [targetId] : []);
    } else if (selectedSpell.type === "aoe") {
      setSelectedTargets((prev) =>
        checked
          ? [...prev, targetId]
          : prev.filter((id) => id !== targetId),
      );
    }

    if (!checked) {
      setSavingThrows((prev) => {
        const next = { ...prev };

        delete next[targetId];

        return next;
      });
    }
  };

  // Парсимо diceType для визначення кількості кубиків
  const parseDiceType = (diceType: string | null | undefined): number => {
    if (!diceType) return 6;

    const match = diceType.match(/d(\d+)/);

    return match ? parseInt(match[1]) : 6;
  };

  const diceTypeValue = selectedSpell?.diceType
    ? parseDiceType(selectedSpell.diceType)
    : 6;

  const diceCount = selectedSpell?.diceCount || 1;

  const handleCast = () => {
    if (!selectedSpellId || !selectedSpell) return;

    if (selectedSpell.type === "no_target") {
      // Без цілей — дозволено
    } else if (selectedSpell.type === "target" && selectedTargets.length !== 1) {
      return;
    } else if (
      (selectedSpell.type === "aoe" || selectedSpell.type === "target") &&
      selectedTargets.length === 0
    ) {
      return;
    }

    // Збираємо saving throws якщо потрібні
    const savingThrowsArray = Object.entries(savingThrows)
      .filter(([, data]) => data.roll > 0)
      .map(([targetId, data]) => ({
        participantId: targetId,
        roll: data.roll,
      }));

    const hitRollNum = hitRoll ? parseInt(hitRoll, 10) : undefined;

    onCast({
      casterId: caster.basicInfo.id,
      casterType: caster.basicInfo.sourceType,
      spellId: selectedSpellId,
      targetIds: selectedSpell.type === "no_target" ? [] : selectedTargets,
      damageRolls: damageRolls.map((r) => parseInt(r)).filter((n) => !isNaN(n)),
      savingThrows:
        savingThrowsArray.length > 0 ? savingThrowsArray : undefined,
      additionalRollResult: additionalRoll
        ? parseInt(additionalRoll)
        : undefined,
      hitRoll:
        hitRollNum !== undefined && hitRollNum >= 1 && hitRollNum <= 20
          ? hitRollNum
          : undefined,
    });

    // Скидаємо форму
    setSelectedSpellId("");
    setSelectedTargets([]);
    setSavingThrows({});
    setDamageRolls([]);
    setAdditionalRoll("");
    setHitRoll("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedSpellId("");
      setSelectedTargets([]);
      setSavingThrows({});
      setDamageRolls([]);
      setAdditionalRoll("");
      setHitRoll("");
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
          {/* Магічні слоти: заповнені (доступні) і пусті (використані) */}
          <div>
            <Label>Магічні слоти</Label>
            <div className="mt-2 space-y-2">
              {Object.entries(spellSlots)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([level, slot]) => {
                  const filled = slot.current;

                  const empty = Math.max(0, slot.max - slot.current);

                  return (
                    <div
                      key={level}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="text-muted-foreground w-16 shrink-0">
                        Рівень {level}:
                      </span>
                      <div
                        className="flex gap-1"
                        aria-label={`Рівень ${level}: ${filled} доступних, ${empty} використаних`}
                      >
                        {Array.from({ length: filled }).map((_, i) => (
                          <span
                            key={`f-${i}`}
                            className={cn(
                              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                              "bg-primary text-primary-foreground",
                            )}
                            title="Доступний слот"
                          >
                            ●
                          </span>
                        ))}
                        {Array.from({ length: empty }).map((_, i) => (
                          <span
                            key={`e-${i}`}
                            className={cn(
                              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground",
                            )}
                            title="Використаний слот"
                          >
                            ○
                          </span>
                        ))}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        ({filled}/{slot.max})
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Вибір заклинання — групування по школах, іконка на початку */}
          <div>
            <Label htmlFor="spell-dialog-select">Заклинання</Label>
            <select
              id="spell-dialog-select"
              value={selectedSpellId}
              onChange={(e) => {
                const nextId = e.target.value;

                setSelectedSpellId(nextId);
                setSpellIconError(false);

                const spell = spells.find((s) => s.id === nextId);

                if (spell?.type === "no_target") setSelectedTargets([]);
              }}
              className={cn(
                "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              aria-label="Оберіть заклинання"
            >
              <option value="">Оберіть заклинання</option>
              {Array.from(spellsByGroup.entries()).map(
                ([groupName, groupSpells]) => (
                  <optgroup key={groupName} label={groupName}>
                    {groupSpells.map((spell) => {
                      const slot = spellSlots[spell.level.toString()];

                      const isAvailable = slot && slot.current > 0;

                      const typeLabel =
                        spell.type === "aoe"
                          ? "AOE"
                          : spell.type === "no_target"
                            ? "No Target"
                            : "Target";

                      return (
                        <option
                          key={spell.id}
                          value={spell.id}
                          disabled={!isAvailable}
                        >
                          {spell.name} (Level {spell.level}) {typeLabel}
                          {!isAvailable ? " — немає слотів" : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                ),
              )}
            </select>
            {selectedSpell && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border bg-muted">
                  {selectedSpell.icon && !spellIconError ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external spell icon URL, fallback on error
                    <img
                      src={selectedSpell.icon}
                      alt=""
                      className="h-5 w-5 object-contain"
                      onError={() => setSpellIconError(true)}
                    />
                  ) : (
                    (() => {
                      const TypeIcon = getSpellTypeIcon(selectedSpell.type);

                      return <TypeIcon className="h-5 w-5 text-muted-foreground" />;
                    })()
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex-1">
                  {selectedSpell.description}
                </p>
              </div>
            )}
          </div>

          {/* Вибір цілей: тільки для target та aoe; no_target — без цілей */}
          {selectedSpell && selectedSpell.type !== "no_target" ? (
            <div>
              <Label>Цілі{selectedSpell.type === "target" ? " (1 ціль)" : " (AOE — кілька)"}</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableTargets.map((target) => (
                  <div
                    key={target.basicInfo.id}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTargets.includes(target.basicInfo.id)}
                      onChange={(e) =>
                        handleTargetToggle(target.basicInfo.id, e.target.checked)
                      }
                    />
                    <label className="flex-1 text-sm">
                      {target.basicInfo.name}
                      {(isDM ||
                        canSeeEnemyHp ||
                        target.basicInfo.side === "ally") && (
                        <span className="text-muted-foreground ml-2">
                          (HP: {target.combatStats.currentHp}/
                          {target.combatStats.maxHp})
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Damage Rolls */}
          {selectedSpell &&
            selectedSpell.damageType !== "heal" &&
            diceCount > 0 && (
              <div>
                <Label>
                  Кубики урону ({diceCount}
                  {selectedSpell.diceType || "d6"})
                </Label>
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
          {selectedSpell &&
            selectedSpell.damageType === "heal" &&
            diceCount > 0 && (
              <div>
                <Label>
                  Кубики лікування ({diceCount}
                  {selectedSpell.diceType || "d6"})
                </Label>
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

          {/* Перевірка попадання (HT) — один кидок для заклинання */}
          {selectedSpell?.hitCheck && (
            <div>
              <Label>
                Кидок попадання ({selectedSpell.hitCheck.ability.toUpperCase()}) — потрібно &gt;= {selectedSpell.hitCheck.dc}
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={hitRoll}
                onChange={(e) => setHitRoll(e.target.value)}
                placeholder="1d20"
              />
            </div>
          )}

          {/* Saving Throws (якщо заклинання вимагає) */}
          {selectedTargets.length > 0 && selectedSpell?.savingThrow && (
            <div>
              <Label>
                Saving Throws ({selectedSpell.savingThrow.ability.toUpperCase()}
                )
              </Label>
              <div className="space-y-2">
                {selectedTargets.map((targetId) => {
                  const target = availableTargets.find(
                    (t) => t.basicInfo.id === targetId,
                  );

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
                              ability:
                                selectedSpell.savingThrow?.ability ?? "unknown",
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
            disabled={
              !selectedSpellId ||
              !selectedSpell ||
              (selectedSpell.type === "no_target"
                ? false
                : selectedSpell.type === "target"
                  ? selectedTargets.length !== 1
                  : selectedTargets.length === 0) ||
              (selectedSpell.hitCheck != null &&
                (() => {
                  const n = hitRoll ? parseInt(hitRoll, 10) : NaN;

                  return !(n >= 1 && n <= 20);
                })())
            }
            className="w-full"
          >
            Застосувати заклинання
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
