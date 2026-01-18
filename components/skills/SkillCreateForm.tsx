"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { createSkill, updateSkill } from "@/lib/api/skills";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useMainSkills } from "@/lib/hooks/useMainSkills";
import { useRaces } from "@/lib/hooks/useRaces";
import { ABILITY_SCORES } from "@/lib/constants/abilities";
import {
  SPELL_ENHANCEMENT_TYPES,
  type SpellEnhancementType,
} from "@/lib/constants/spell-enhancement";
import {
  DAMAGE_MODIFIER_OPTIONS,
  SPELL_TARGET_OPTIONS,
} from "@/lib/constants/spells";
import { DICE_OPTIONS } from "@/lib/constants/dice";

interface SpellOption {
  id: string;
  name: string;
}

interface SpellGroupOption {
  id: string;
  name: string;
}

import type { Race } from "@/lib/types/races";

interface SkillCreateFormProps {
  campaignId: string;
  spells: SpellOption[];
  spellGroups: SpellGroupOption[];
  initialRaces?: Race[];
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    races: unknown;
    isRacial: boolean;
    bonuses: unknown;
    damage: number | null;
    armor: number | null;
    speed: number | null;
    physicalResistance: number | null;
    magicalResistance: number | null;
    spellId: string | null;
    spellGroupId: string | null;
    mainSkillId: string | null;
    spellEnhancementTypes?: unknown;
    spellEffectIncrease?: number | null;
    spellTargetChange?: unknown;
    spellAdditionalModifier?: unknown;
    spellNewSpellId?: string | null;
  };
}

export function SkillCreateForm({
  campaignId,
  spells,
  spellGroups,
  initialRaces = [],
  initialData,
}: SkillCreateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: mainSkills = [] } = useMainSkills(campaignId);
  const { data: races = [] } = useRaces(campaignId, initialRaces);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [icon, setIcon] = useState(initialData?.icon || "");
  // selectedRaces тепер зберігає ID рас, а не назви
  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);

  // Оновлюємо selectedRaces коли races завантажуються або змінюється initialData
  useEffect(() => {
    if (!initialData?.races || !Array.isArray(initialData.races)) {
      setSelectedRaces([]);
      return;
    }

    // Конвертуємо race values (можуть бути ID або назви) в ID
    const convertedRaces = initialData.races
      .map((raceValue: string) => {
        // Перевіряємо чи це ID (cuid зазвичай довший ~25 символів) або назва
        const isLikelyId = raceValue.length > 20;

        if (isLikelyId) {
          // Схоже на ID, перевіряємо чи він існує в списку рас
          const race = races.find((r) => r.id === raceValue);
          return race ? race.id : null;
        } else {
          // Схоже на назву, шукаємо ID
          const race = races.find((r) => r.name === raceValue);
          return race ? race.id : null;
        }
      })
      .filter((id): id is string => Boolean(id));

    setSelectedRaces(convertedRaces);
  }, [initialData?.races, races]);
  const [isRacial, setIsRacial] = useState(initialData?.isRacial || false);
  const [bonuses, setBonuses] = useState<Record<string, number>>(
    (initialData?.bonuses &&
    typeof initialData.bonuses === "object" &&
    !Array.isArray(initialData.bonuses)
      ? initialData.bonuses
      : {}) as Record<string, number>
  );
  const [damage, setDamage] = useState(initialData?.damage?.toString() || "");
  const [armor, setArmor] = useState(initialData?.armor?.toString() || "");
  const [speed, setSpeed] = useState(initialData?.speed?.toString() || "");
  const [physicalResistance, setPhysicalResistance] = useState(
    initialData?.physicalResistance?.toString() || ""
  );
  const [magicalResistance, setMagicalResistance] = useState(
    initialData?.magicalResistance?.toString() || ""
  );
  const [spellId, setSpellId] = useState<string | null>(
    initialData?.spellId || null
  );
  const [spellGroupId, setSpellGroupId] = useState<string | null>(
    initialData?.spellGroupId || null
  );
  const [mainSkillId, setMainSkillId] = useState<string | null>(
    initialData?.mainSkillId || null
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);

  // Поля для покращення спела
  const [spellEnhancementTypes, setSpellEnhancementTypes] = useState<
    SpellEnhancementType[]
  >(
    initialData && Array.isArray(initialData.spellEnhancementTypes)
      ? (initialData.spellEnhancementTypes as SpellEnhancementType[])
      : []
  );
  const [spellEffectIncrease, setSpellEffectIncrease] = useState(
    (initialData?.spellEffectIncrease?.toString() || "") as string
  );
  const [spellTargetChange, setSpellTargetChange] = useState<string | null>(
    initialData?.spellTargetChange &&
    typeof initialData.spellTargetChange === "object" &&
    initialData.spellTargetChange !== null &&
    "target" in initialData.spellTargetChange
      ? (initialData.spellTargetChange as { target: string }).target
      : null
  );
  const [spellAdditionalModifier, setSpellAdditionalModifier] = useState<{
    modifier?: string;
    damageDice?: string;
    duration?: number;
  }>(
    initialData?.spellAdditionalModifier &&
    typeof initialData.spellAdditionalModifier === "object" &&
    initialData.spellAdditionalModifier !== null
      ? (initialData.spellAdditionalModifier as {
          modifier?: string;
          damageDice?: string;
          duration?: number;
        })
      : {
          modifier: undefined,
          damageDice: "",
          duration: undefined,
        }
  );
  const [spellNewSpellId, setSpellNewSpellId] = useState<string | null>(
    initialData?.spellNewSpellId || null
  );

  const handleRaceToggle = (race: string) => {
    setSelectedRaces((prev) =>
      prev.includes(race) ? prev.filter((r) => r !== race) : [...prev, race]
    );
  };

  const handleEnhancementTypeToggle = (type: SpellEnhancementType) => {
    setSpellEnhancementTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleBonusChange = (attr: string, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(numValue)) return;
    setBonuses((prev) => ({
      ...prev,
      [attr]: numValue,
    }));
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setIsCreatingGroup(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/spells/groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newGroupName.trim() }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create group");
      }

      const newGroup = await response.json();
      setSpellGroupId(newGroup.id);
      setIsGroupDialogOpen(false);
      setNewGroupName("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка створення";
      setError(message);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
        races: selectedRaces,
        isRacial,
        bonuses: Object.fromEntries(
          Object.entries(bonuses).filter(([_, v]) => v !== 0)
        ),
        damage: damage ? parseInt(damage, 10) : undefined,
        armor: armor ? parseInt(armor, 10) : undefined,
        speed: speed ? parseInt(speed, 10) : undefined,
        physicalResistance: physicalResistance
          ? parseInt(physicalResistance, 10)
          : undefined,
        magicalResistance: magicalResistance
          ? parseInt(magicalResistance, 10)
          : undefined,
        spellId: spellId || undefined,
        spellGroupId: spellGroupId || undefined,
        mainSkillId: mainSkillId || undefined,
        spellEnhancementTypes:
          spellEnhancementTypes.length > 0 ? spellEnhancementTypes : undefined,
        spellEffectIncrease: spellEffectIncrease
          ? parseInt(spellEffectIncrease, 10)
          : undefined,
        spellTargetChange:
          spellTargetChange && spellEnhancementTypes.includes("target_change")
            ? { target: spellTargetChange }
            : undefined,
        spellAdditionalModifier:
          spellEnhancementTypes.includes("additional_modifier") &&
          spellAdditionalModifier.modifier
            ? {
                modifier: spellAdditionalModifier.modifier,
                damageDice: spellAdditionalModifier.damageDice || undefined,
                duration: spellAdditionalModifier.duration || undefined,
              }
            : undefined,
        spellNewSpellId: spellNewSpellId || undefined,
      };

      if (isEdit && initialData) {
        await updateSkill(campaignId, initialData.id, payload);
      } else {
        await createSkill(campaignId, payload);
      }

      // Оновлюємо кеш React Query перед перенаправленням
      await queryClient.invalidateQueries({ queryKey: ["skills", campaignId] });
      router.push(`/campaigns/${campaignId}/dm/skills`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка створення";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Редагувати скіл" : "Створити скіл"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Оновіть інформацію про скіл"
            : "Додайте новий скіл з його характеристиками та ефектами"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="skill-name">Назва *</Label>
            <Input
              id="skill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Майстерність з мечем"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-description">Опис</Label>
            <Textarea
              id="skill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опис скіла"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-icon">Іконка (URL)</Label>
            <Input
              id="skill-icon"
              type="url"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="https://example.com/icon.png"
            />
            {icon && (
              <div className="mt-2">
                <div className="w-16 h-16 rounded border overflow-hidden bg-muted flex items-center justify-center">
                  <OptimizedImage
                    src={icon}
                    alt="Preview"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-xs text-muted-foreground">
                          Помилка завантаження
                        </span>
                      </div>
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Раси (для яких підходить скіл)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {races.map((race) => (
                <div key={race.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`race-${race.id}`}
                    checked={selectedRaces.includes(race.id)}
                    onCheckedChange={() => handleRaceToggle(race.id)}
                  />
                  <Label
                    htmlFor={`race-${race.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {race.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-racial"
              checked={isRacial}
              onCheckedChange={(checked) => setIsRacial(checked === true)}
            />
            <Label
              htmlFor="is-racial"
              className="text-sm font-normal cursor-pointer"
            >
              Рассовий навик
            </Label>
          </div>

          <div className="rounded-md border p-4 space-y-3">
            <p className="text-sm font-semibold">Бонуси до характеристик</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ABILITY_SCORES.map((attr) => (
                <div key={attr.key} className="space-y-1">
                  <Label htmlFor={`bonus-${attr.key}`} className="text-xs">
                    {attr.label}
                  </Label>
                  <Input
                    id={`bonus-${attr.key}`}
                    type="number"
                    value={bonuses[attr.key] || ""}
                    onChange={(e) =>
                      handleBonusChange(attr.key, e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="skill-damage">Шкода</Label>
              <Input
                id="skill-damage"
                type="number"
                value={damage}
                onChange={(e) => setDamage(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-armor">Броня</Label>
              <Input
                id="skill-armor"
                type="number"
                value={armor}
                onChange={(e) => setArmor(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-speed">Швидкість</Label>
              <Input
                id="skill-speed"
                type="number"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-physical-resistance">Резист фізичний</Label>
              <Input
                id="skill-physical-resistance"
                type="number"
                value={physicalResistance}
                onChange={(e) => setPhysicalResistance(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-magical-resistance">Резист магічний</Label>
              <Input
                id="skill-magical-resistance"
                type="number"
                value={magicalResistance}
                onChange={(e) => setMagicalResistance(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="skill-spell">Покращення спела</Label>
                <Select
                  value={spellId || "none"}
                  onValueChange={(value) =>
                    setSpellId(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger id="skill-spell">
                    <SelectValue placeholder="Без спела" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без спела</SelectItem>
                    {spells.map((spell) => (
                      <SelectItem key={spell.id} value={spell.id}>
                        {spell.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-main-skill">Основний навик</Label>
                <Select
                  value={mainSkillId || "none"}
                  onValueChange={(value) =>
                    setMainSkillId(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger id="skill-main-skill">
                    <SelectValue placeholder="Без основного навику" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без основного навику</SelectItem>
                    {mainSkills.map((mainSkill) => (
                      <SelectItem key={mainSkill.id} value={mainSkill.id}>
                        {mainSkill.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {spellId && (
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="spell-enhancement">
                  <AccordionTrigger className="px-4">
                    <span className="font-medium">Налаштування покращення спела</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div className="space-y-3">
                      <Label>Типи покращення (можна вибрати декілька)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {SPELL_ENHANCEMENT_TYPES.map((type) => (
                          <div key={type.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`enhancement-${type.value}`}
                              checked={spellEnhancementTypes.includes(type.value)}
                              onCheckedChange={() =>
                                handleEnhancementTypeToggle(type.value)
                              }
                            />
                            <Label
                              htmlFor={`enhancement-${type.value}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {type.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {spellEnhancementTypes.includes("effect_increase") && (
                      <div className="space-y-2 border-t pt-4">
                        <Label htmlFor="spell-effect-increase">
                          Збільшення ефекту (%)
                        </Label>
                        <Input
                          id="spell-effect-increase"
                          type="number"
                          min="0"
                          max="200"
                          value={spellEffectIncrease}
                          onChange={(e) =>
                            setSpellEffectIncrease(e.target.value)
                          }
                          placeholder="Наприклад: 25"
                        />
                        <p className="text-xs text-muted-foreground">
                          Відсоток, на який збільшується ефективність заклинання
                          (шкода/лікування)
                        </p>
                      </div>
                    )}

                    {spellEnhancementTypes.includes("target_change") && (
                      <div className="space-y-2 border-t pt-4">
                        <Label htmlFor="spell-target-change">Новий таргет</Label>
                        <Select
                          value={spellTargetChange || "none"}
                          onValueChange={(value) =>
                            setSpellTargetChange(
                              value === "none" ? null : value
                            )
                          }
                        >
                          <SelectTrigger id="spell-target-change">
                            <SelectValue placeholder="Виберіть таргет" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без зміни</SelectItem>
                            {SPELL_TARGET_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {spellEnhancementTypes.includes("additional_modifier") && (
                      <div className="space-y-3 border-t pt-4">
                        <Label>Додатковий модифікатор</Label>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="additional-modifier-type">
                              Тип модифікатора
                            </Label>
                            <Select
                              value={spellAdditionalModifier.modifier || "none"}
                              onValueChange={(value) =>
                                setSpellAdditionalModifier({
                                  ...spellAdditionalModifier,
                                  modifier: value === "none" ? undefined : value,
                                })
                              }
                            >
                              <SelectTrigger id="additional-modifier-type">
                                <SelectValue placeholder="Виберіть модифікатор" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  Без модифікатора
                                </SelectItem>
                                {DAMAGE_MODIFIER_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {spellAdditionalModifier.modifier && (
                            <>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="additional-modifier-dice">
                                    Кубики шкоди
                                  </Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id="additional-modifier-dice-count"
                                      type="number"
                                      min="0"
                                      max="10"
                                      placeholder="Кількість"
                                      value={
                                        spellAdditionalModifier.damageDice?.match(
                                          /^(\d+)/
                                        )?.[1] || ""
                                      }
                                      onChange={(e) => {
                                        const count = e.target.value;
                                        const diceMatch = spellAdditionalModifier.damageDice?.match(
                                          /d(\d+)/
                                        );
                                        const diceType = diceMatch?.[1] || "6";
                                        setSpellAdditionalModifier({
                                          ...spellAdditionalModifier,
                                          damageDice: count
                                            ? `${count}d${diceType}`
                                            : "",
                                        });
                                      }}
                                    />
                                    <Select
                                      value={
                                        (() => {
                                          const match = spellAdditionalModifier.damageDice?.match(
                                            /d(\d+)/
                                          );
                                          return match?.[1] || "6";
                                        })()
                                      }
                                      onValueChange={(diceTypeNum) => {
                                        const count =
                                          spellAdditionalModifier.damageDice?.match(
                                            /^(\d+)/
                                          )?.[1] || "1";
                                        setSpellAdditionalModifier({
                                          ...spellAdditionalModifier,
                                          damageDice: `${count}d${diceTypeNum}`,
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="w-24">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DICE_OPTIONS.map((dice) => (
                                          <SelectItem
                                            key={dice.value}
                                            value={dice.value.replace("d", "")}
                                          >
                                            {dice.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="additional-modifier-duration">
                                    Тривалість (раунди)
                                  </Label>
                                  <Input
                                    id="additional-modifier-duration"
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={
                                      spellAdditionalModifier.duration?.toString() ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      setSpellAdditionalModifier({
                                        ...spellAdditionalModifier,
                                        duration: e.target.value
                                          ? parseInt(e.target.value, 10)
                                          : undefined,
                                      })
                                    }
                                    placeholder="Наприклад: 3"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Вороги отримують додаткову шкоду протягом вказаної
                                кількості раундів
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {spellEnhancementTypes.includes("new_spell") && (
                      <div className="space-y-2 border-t pt-4">
                        <Label htmlFor="spell-new-spell">Нове заклинання</Label>
                        <Select
                          value={spellNewSpellId || "none"}
                          onValueChange={(value) =>
                            setSpellNewSpellId(value === "none" ? null : value)
                          }
                        >
                          <SelectTrigger id="spell-new-spell">
                            <SelectValue placeholder="Виберіть заклинання" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без нового заклинання</SelectItem>
                            {spells.map((spell) => (
                              <SelectItem key={spell.id} value={spell.id}>
                                {spell.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? isEdit
                  ? "Збереження..."
                  : "Створення..."
                : isEdit
                ? "Зберегти зміни"
                : "Створити скіл"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/campaigns/${campaignId}/dm/skills`)}
              disabled={isSaving}
            >
              Скасувати
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
