"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { DICE_OPTIONS } from "@/lib/constants/dice";
import { DAMAGE_MODIFIER_OPTIONS, HEAL_MODIFIER_OPTIONS, SPELL_TARGET_OPTIONS } from "@/lib/constants/spells";
import {
  useCreateSpell,
  useSpellGroups,
} from "@/lib/hooks/useSpells";
import type { Spell, SpellGroup } from "@/types/spells";

export default function NewSpellPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const router = useRouter();

  const [formData, setFormData] = useState<Partial<Spell>>({
    name: "",
    level: 0,
    type: "target",
    target: null,
    damageType: "damage",
    damageElement: null,
    damageModifier: null,
    healModifier: null,
    castingTime: "",
    range: "",
    components: "",
    duration: "",
    concentration: false,
    diceCount: null,
    diceType: null,
    savingThrow: null,
    description: "",
    groupId: null,
    icon: null,
  });

  const { data: spellGroups = [] } = useSpellGroups(id);

  const createSpellMutation = useCreateSpell(id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      alert("Будь ласка, заповніть обов'язкові поля: назва та опис");

      return;
    }

    createSpellMutation.mutate(
      {
        ...formData,
        name: formData.name!,
        description: formData.description!,
        type: formData.type || "target",
        damageType: formData.damageType || "damage",
        target: formData.target || null,
        damageElement: formData.damageElement || null,
        damageModifier: formData.damageModifier || null,
        healModifier: formData.healModifier || null,
        castingTime: formData.castingTime || null,
        range: formData.range || null,
        components: formData.components || null,
        duration: formData.duration || null,
        diceCount: formData.diceCount || null,
        diceType: formData.diceType || null,
        savingThrow: formData.savingThrow || null,
        groupId: formData.groupId || null,
        icon: formData.icon || null,
      },
      {
        onSuccess: () => {
          router.push(`/campaigns/${id}/dm/spells`);
        },
        onError: (error) => {
          console.error("Error creating spell:", error);
        },
      }
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Створити нове заклинання</CardTitle>
          <CardDescription>Додайте інформацію про нове заклинання</CardDescription>
        </CardHeader>
        <CardContent>
          {createSpellMutation.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Помилка:</strong>
              <span className="block sm:inline">
                {" "}
                {(createSpellMutation.error as Error)?.message || "Помилка"}
              </span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput
                id="name"
                label="Назва заклинання"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Назва заклинання"
              />
              <div>
                <Label htmlFor="level">Рівень *</Label>
                <SelectField
                  id="level"
                  value={formData.level?.toString() || "0"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, level: parseInt(value) })
                  }
                  placeholder="Виберіть рівень"
                  options={[
                    { value: "0", label: "Cantrip" },
                    { value: "1", label: "1" },
                    { value: "2", label: "2" },
                    { value: "3", label: "3" },
                    { value: "4", label: "4" },
                    { value: "5", label: "5" },
                    { value: "6", label: "6" },
                    { value: "7", label: "7" },
                    { value: "8", label: "8" },
                    { value: "9", label: "9" },
                  ]}
                />
              </div>
              <div>
                <Label htmlFor="groupId">Група заклинань</Label>
                <SelectField
                  id="groupId"
                  value={formData.groupId || ""}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      groupId: value || null,
                    })
                  }
                  placeholder="Виберіть групу"
                  options={spellGroups.map(group => ({ value: group.id, label: group.name }))}
                  allowNone
                  noneLabel="Без групи"
                />
              </div>
              <div>
                <Label htmlFor="type">Тип *</Label>
                <SelectField
                  id="type"
                  value={formData.type || "target"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as "target" | "aoe" })
                  }
                  placeholder="Виберіть тип"
                  options={[
                    { value: "target", label: "Цільове" },
                    { value: "aoe", label: "Область дії" },
                  ]}
                />
              </div>
              <div>
                <Label htmlFor="target">Ціль</Label>
                <SelectField
                  id="target"
                  value={formData.target || ""}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      target: value || null,
                    })
                  }
                  placeholder="Виберіть ціль"
                  options={SPELL_TARGET_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                  allowNone
                  noneLabel="Не вказано"
                />
              </div>
              <div>
                <Label htmlFor="damageType">Тип шкоди/ефекту *</Label>
                <SelectField
                  id="damageType"
                  value={formData.damageType || "damage"}
                  onValueChange={(value: string) => {
                    const newValue = value as "damage" | "heal" | "all";

                    setFormData({
                      ...formData,
                      damageType: newValue,
                      damageModifier: newValue === "damage" || newValue === "all" ? formData.damageModifier : null,
                      healModifier: newValue === "heal" ? formData.healModifier : null,
                    });
                  }}
                  placeholder="Виберіть тип"
                  options={[
                    { value: "damage", label: "Шкода" },
                    { value: "heal", label: "Лікування" },
                    { value: "all", label: "Усі" },
                  ]}
                />
              </div>

              {(formData.damageType === "damage" || formData.damageType === "all") && (
                <>
                  <div>
                    <Label>Елемент шкоди</Label>
                    <SelectField
                      value={formData.damageElement || ""}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          damageElement: value || null,
                        })
                      }
                      placeholder="Без елементу"
                      options={DAMAGE_ELEMENT_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                      allowNone
                      noneLabel="Без елементу"
                    />
                  </div>
                  <div>
                    <Label>Модифікатор шкоди</Label>
                    <SelectField
                      value={formData.damageModifier || ""}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          damageModifier: value || null,
                        })
                      }
                      placeholder="Без модифікатора"
                      options={DAMAGE_MODIFIER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                      allowNone
                      noneLabel="Без модифікатора"
                    />
                  </div>
                </>
              )}

              {formData.damageType === "heal" && (
                <div>
                  <Label>Модифікатор лікування</Label>
                  <SelectField
                    value={formData.healModifier || ""}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        healModifier: value || null,
                      })
                    }
                    placeholder="Без модифікатора"
                    options={HEAL_MODIFIER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                    allowNone
                    noneLabel="Без модифікатора"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="castingTime">Час створення</Label>
                <Input
                  id="castingTime"
                  value={formData.castingTime || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, castingTime: e.target.value })
                  }
                  placeholder="1 action"
                />
              </div>

              <div>
                <Label htmlFor="range">Дальність</Label>
                <Input
                  id="range"
                  value={formData.range || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, range: e.target.value })
                  }
                  placeholder="60 feet"
                />
              </div>

              <div>
                <Label htmlFor="components">Компоненти</Label>
                <Input
                  id="components"
                  value={formData.components || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, components: e.target.value })
                  }
                  placeholder="V, S, M"
                />
              </div>

              <div>
                <Label htmlFor="duration">Тривалість</Label>
                <Input
                  id="duration"
                  value={formData.duration || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  placeholder="Instantaneous"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="dice">
                  {formData.damageType === "heal" ? "Кубики лікування" : "Кубики шкоди"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="diceCount"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.diceCount ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        diceCount: e.target.value === "" ? null : parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    className="w-20"
                  />
                  <SelectField
                    value={formData.diceType || ""}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        diceType: value || null,
                      })
                    }
                    placeholder="Тип кубика"
                    options={DICE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                    allowNone
                    noneLabel="Без кубиків"
                    triggerClassName="flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="concentration"
                  checked={formData.concentration || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      concentration: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="concentration" className="cursor-pointer">
                  Концентрація
                </Label>
              </div>
            </div>

            <div>
              <Label>Збереження</Label>
              <div className="grid gap-4 md:grid-cols-2 mt-2">
                <div>
                  <Label htmlFor="savingThrowAbility">Характеристика</Label>
                  <SelectField
                    id="savingThrowAbility"
                    value={
                      formData.savingThrow &&
                      typeof formData.savingThrow === "object" &&
                      "ability" in formData.savingThrow
                        ? String(formData.savingThrow.ability)
                        : ""
                    }
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        savingThrow: {
                          ability: value,
                          onSuccess:
                            (formData.savingThrow &&
                              typeof formData.savingThrow === "object" &&
                              "onSuccess" in formData.savingThrow &&
                              String(formData.savingThrow.onSuccess)) ||
                            "half",
                        },
                      })
                    }
                    placeholder="Виберіть характеристику"
                    options={[
                      { value: "strength", label: "Сила" },
                      { value: "dexterity", label: "Спритність" },
                      { value: "constitution", label: "Статура" },
                      { value: "intelligence", label: "Інтелект" },
                      { value: "wisdom", label: "Мудрість" },
                      { value: "charisma", label: "Харизма" },
                    ]}
                  />
                </div>
                <div>
                  <Label htmlFor="savingThrowOnSuccess">При успіху</Label>
                  <SelectField
                    id="savingThrowOnSuccess"
                    value={
                      formData.savingThrow &&
                      typeof formData.savingThrow === "object" &&
                      "onSuccess" in formData.savingThrow
                        ? String(formData.savingThrow.onSuccess)
                        : ""
                    }
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        savingThrow: {
                          ability:
                            (formData.savingThrow &&
                              typeof formData.savingThrow === "object" &&
                              "ability" in formData.savingThrow &&
                              String(formData.savingThrow.ability)) ||
                            "strength",
                          onSuccess: value as "half" | "none",
                        },
                      })
                    }
                    placeholder="Виберіть ефект"
                    options={[
                      { value: "half", label: "Половина шкоди" },
                      { value: "none", label: "Без шкоди" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Опис *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                placeholder="Детальний опис заклинання"
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="icon">Посилання на картинку</Label>
              <Input
                id="icon"
                type="text"
                value={formData.icon || ""}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value || null })
                }
                placeholder="https://example.com/spell-icon.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Введіть URL картинки з інтернету
              </p>
              {formData.icon && (
                <div className="mt-3">
                  <Label>Попередній перегляд:</Label>
                  <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden bg-muted border">
                    <img
                      src={formData.icon}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;

                        target.style.display = "none";
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={createSpellMutation.isPending}
              >
                {createSpellMutation.isPending
                  ? "Створення..."
                  : "Створити заклинання"}
              </Button>
              <Link href={`/campaigns/${id}/dm/spells`}>
                <Button type="button" variant="outline">
                  Скасувати
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
