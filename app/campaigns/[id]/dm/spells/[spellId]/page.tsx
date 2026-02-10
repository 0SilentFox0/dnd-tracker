"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
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
import { SPELL_EFFECT_OPTIONS } from "@/lib/constants/spell-effects";
import {
  DAMAGE_MODIFIER_OPTIONS,
  HEAL_MODIFIER_OPTIONS,
  SPELL_TARGET_OPTIONS,
} from "@/lib/constants/spells";
import {
  useDeleteSpell,
  useSpell,
  useSpellGroups,
  useUpdateSpell,
} from "@/lib/hooks/useSpells";
import type { Spell } from "@/types/spells";

export default function EditSpellPage({
  params,
}: {
  params: Promise<{ id: string; spellId: string }>;
}) {
  const { id, spellId } = use(params);

  const router = useRouter();

  const [formData, setFormData] = useState<Partial<Spell> & { effects?: string[] }>({
    name: "",
    level: 0,
    type: "target",
    target: null,
    damageType: "damage",
    damageElement: null,
    damageModifier: null,
    healModifier: null,
    castingTime: null,
    range: "",
    duration: "",
    diceCount: null,
    diceType: null,
    savingThrow: null,
    description: null,
    effects: [],
    groupId: null,
    icon: null,
  });

  const { data: spell, isLoading: fetching } = useSpell(id, spellId);

  const { data: spellGroups = [] } = useSpellGroups(id);

  const updateSpellMutation = useUpdateSpell(id, spellId);

  const deleteSpellMutation = useDeleteSpell(id, spellId);

  // Оновлюємо formData коли spell завантажиться
  useEffect(() => {
    if (spell) {
      // Використовуємо функцію оновлення для уникнення синхронного setState в effect
      const timer = setTimeout(() => {
        setFormData({
          name: spell.name,
          level: spell.level,
          type: spell.type,
          target: spell.target || null,
          damageType: spell.damageType,
          damageElement: spell.damageElement || null,
          damageModifier: spell.damageModifier || null,
          healModifier: spell.healModifier || null,
          castingTime: spell.castingTime || null,
          range: spell.range || "",
          duration: spell.duration || "",
          diceCount: spell.diceCount || null,
          diceType: spell.diceType || null,
          savingThrow: spell.savingThrow,
          description: spell.description ?? null,
          effects: (() => {
            const raw = Array.isArray(spell.effects) ? spell.effects : spell.description ? [spell.description] : [];
            return raw.flatMap((e) =>
              String(e)
                .split(/\s*,\s*/)
                .map((s) => s.trim())
                .filter(Boolean)
            );
          })(),
          groupId: spell.groupId,
          icon: spell.icon || null,
        });
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [spell]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    updateSpellMutation.mutate(
      {
        ...formData,
        target: formData.target || null,
        damageElement: formData.damageElement || null,
        damageModifier: formData.damageModifier || null,
        healModifier: formData.healModifier || null,
        castingTime: formData.castingTime || null,
        range: formData.range || null,
        duration: formData.duration || null,
        diceCount: formData.diceCount || null,
        diceType: formData.diceType || null,
        savingThrow: formData.savingThrow || null,
        description: formData.description ?? null,
        effects: formData.effects ?? null,
        groupId: formData.groupId || null,
        icon: formData.icon || null,
      },
      {
        onSuccess: () => {
          router.push(`/campaigns/${id}/dm/spells`);
        },
        onError: (error) => {
          console.error("Error updating spell:", error);
        },
      },
    );
  };

  const handleDelete = async () => {
    if (!confirm("Ви впевнені, що хочете видалити це заклинання?")) {
      return;
    }

    deleteSpellMutation.mutate(undefined, {
      onSuccess: () => {
        router.push(`/campaigns/${id}/dm/spells`);
      },
      onError: (error) => {
        console.error("Error deleting spell:", error);
      },
    });
  };

  if (fetching) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Завантаження...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Редагувати заклинання: {formData.name}</CardTitle>
          <CardDescription>Оновіть інформацію про заклинання</CardDescription>
        </CardHeader>
        <CardContent>
          {(updateSpellMutation.error || deleteSpellMutation.error) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Помилка:</strong>
              <span className="block sm:inline">
                {" "}
                {(updateSpellMutation.error as Error)?.message ||
                  (deleteSpellMutation.error as Error)?.message ||
                  "Помилка"}
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
                  options={spellGroups.map((group) => ({
                    value: group.id,
                    label: group.name,
                  }))}
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
                    setFormData({
                      ...formData,
                      type: value as "target" | "aoe" | "no_target",
                    })
                  }
                  placeholder="Виберіть тип"
                  options={[
                    { value: "target", label: "Цільове" },
                    { value: "aoe", label: "Область дії" },
                    { value: "no_target", label: "Без цілі" },
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
                  options={SPELL_TARGET_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
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
                    const newValue = value as "damage" | "heal" | "all" | "buff" | "debuff";

                    setFormData({
                      ...formData,
                      damageType: newValue,
                      damageModifier:
                        newValue === "damage" || newValue === "all"
                          ? formData.damageModifier
                          : null,
                      healModifier:
                        newValue === "heal" ? formData.healModifier : null,
                    });
                  }}
                  placeholder="Виберіть тип"
                  options={[
                    { value: "damage", label: "Шкода" },
                    { value: "heal", label: "Лікування" },
                    { value: "all", label: "Усі" },
                    { value: "buff", label: "Баф (можна розвіяти)" },
                    { value: "debuff", label: "Дебаф (можна розвіяти)" },
                  ]}
                />
              </div>

              {(formData.damageType === "damage" ||
                formData.damageType === "all") && (
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
                      options={DAMAGE_ELEMENT_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
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
                      options={DAMAGE_MODIFIER_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
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
                    options={HEAL_MODIFIER_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    }))}
                    allowNone
                    noneLabel="Без модифікатора"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="castingTime">Час створення</Label>
                <SelectField
                  id="castingTime"
                  value={formData.castingTime || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, castingTime: value || null })
                  }
                  placeholder="Виберіть"
                  options={[
                    { value: "1 action", label: "1 action" },
                    { value: "1 bonus action", label: "1 bonus action" },
                  ]}
                  allowNone
                  noneLabel="Не вказано"
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
                  {formData.damageType === "heal"
                    ? "Кубики лікування"
                    : "Кубики шкоди"}
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
                        diceCount:
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value) || 0,
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
                    options={DICE_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    }))}
                    allowNone
                    noneLabel="Без кубиків"
                    triggerClassName="flex-1"
                  />
                </div>
              </div>

            </div>

            <div>
              <Label>Збереження (Save)</Label>
              <div className="grid gap-4 md:grid-cols-3 mt-2">
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
                          dc:
                            (formData.savingThrow &&
                              typeof formData.savingThrow === "object" &&
                              "dc" in formData.savingThrow &&
                              formData.savingThrow.dc) ??
                            null,
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
                  <Label htmlFor="savingThrowDc">Складність (DC)</Label>
                  <Input
                    id="savingThrowDc"
                    type="number"
                    min={1}
                    max={30}
                    value={
                      formData.savingThrow &&
                      typeof formData.savingThrow === "object" &&
                      "dc" in formData.savingThrow &&
                      formData.savingThrow.dc != null
                        ? Number(formData.savingThrow.dc)
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({
                        ...formData,
                        savingThrow: {
                          ability:
                            (formData.savingThrow &&
                              typeof formData.savingThrow === "object" &&
                              "ability" in formData.savingThrow &&
                              String(formData.savingThrow.ability)) ||
                            "strength",
                          onSuccess:
                            (formData.savingThrow &&
                              typeof formData.savingThrow === "object" &&
                              "onSuccess" in formData.savingThrow &&
                              String(formData.savingThrow.onSuccess)) ||
                            "half",
                          dc: v === "" ? null : parseInt(v, 10) || null,
                        },
                      });
                    }}
                    placeholder="—"
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
                          dc:
                            (formData.savingThrow &&
                              typeof formData.savingThrow === "object" &&
                              "dc" in formData.savingThrow &&
                              formData.savingThrow.dc) ??
                            null,
                        },
                      })
                    }
                    placeholder="Виберіть ефект"
                    options={[
                      { value: "half", label: "Половина шкоди" },
                      { value: "none", label: "Без урону" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Ефекти</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Виберіть ефекти зі списку. Кожен ефект зберігається окремо.
              </p>
              <div className="flex gap-2 mb-3">
                {(() => {
                  const available = SPELL_EFFECT_OPTIONS.filter(
                    (opt) => !(formData.effects ?? []).includes(opt.value)
                  );
                  return available.length > 0 ? (
                    <SelectField
                      value=""
                      onValueChange={(value) => {
                        if (!value) return;
                        const current = formData.effects ?? [];
                        if (current.includes(value)) return;
                        setFormData({ ...formData, effects: [...current, value] });
                      }}
                      placeholder="Додати ефект..."
                      options={available}
                      triggerClassName="flex-1"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      Усі ефекти з бази вже додано
                    </p>
                  );
                })()}
              </div>
              <ul className="space-y-2">
                {(formData.effects ?? []).map((effect, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span className="flex-1 min-w-0">{effect}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => {
                        const next = (formData.effects ?? []).filter((_, i) => i !== idx);
                        setFormData({ ...formData, effects: next });
                      }}
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ul>
              {(formData.effects ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground italic">Ефекти не додано</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Опис (опційно)</Label>
              <Textarea
                id="description"
                value={formData.description ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value || null })
                }
                placeholder="Додатковий опис за потреби"
                rows={2}
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
                    <Image
                      src={formData.icon}
                      alt="Preview"
                      width={128}
                      height={128}
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
              <Button type="submit" disabled={updateSpellMutation.isPending}>
                {updateSpellMutation.isPending
                  ? "Збереження..."
                  : "Зберегти зміни"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteSpellMutation.isPending}
              >
                {deleteSpellMutation.isPending ? "Видалення..." : "Видалити"}
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
