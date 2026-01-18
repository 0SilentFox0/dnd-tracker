"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  useSpell,
  useSpellGroups,
  useUpdateSpell,
  useDeleteSpell,
} from "@/lib/hooks/useSpells";
import type { Spell, SpellGroup } from "@/lib/api/spells";
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
import Link from "next/link";
import { DAMAGE_MODIFIER_OPTIONS, HEAL_MODIFIER_OPTIONS, SPELL_TARGET_OPTIONS } from "@/lib/constants/spells";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { DICE_OPTIONS } from "@/lib/constants/dice";

export default function EditSpellPage({
  params,
}: {
  params: Promise<{ id: string; spellId: string }>;
}) {
  const { id, spellId } = use(params);
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

  const { data: spell, isLoading: fetching } = useSpell(id, spellId);
  const { data: spellGroups = [] } = useSpellGroups(id);
  const updateSpellMutation = useUpdateSpell(id, spellId);
  const deleteSpellMutation = useDeleteSpell(id, spellId);

  // Оновлюємо formData коли spell завантажиться
  useEffect(() => {
    if (spell) {
      setFormData({
        name: spell.name,
        level: spell.level,
        type: spell.type,
        target: spell.target || null,
        damageType: spell.damageType,
        damageElement: spell.damageElement || null,
        damageModifier: spell.damageModifier || null,
        healModifier: spell.healModifier || null,
        castingTime: spell.castingTime || "",
        range: spell.range || "",
        components: spell.components || "",
        duration: spell.duration || "",
        concentration: spell.concentration,
        diceCount: spell.diceCount || null,
        diceType: spell.diceType || null,
        savingThrow: spell.savingThrow,
        description: spell.description,
        groupId: spell.groupId,
        icon: spell.icon || null,
      });
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
          console.error("Error updating spell:", error);
        },
      }
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
              <div>
                <Label htmlFor="name">Назва заклинання *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="Назва заклинання"
                />
              </div>

              <div>
                <Label htmlFor="level">Рівень *</Label>
                <Select
                  value={formData.level?.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, level: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Виберіть рівень" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Cantrip</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="groupId">Група заклинань</Label>
                <Select
                  value={formData.groupId || ""}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      groupId: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Виберіть групу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без групи</SelectItem>
                    {spellGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Тип *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "target" | "aoe") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="target">Цільове</SelectItem>
                    <SelectItem value="aoe">Область дії</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target">Ціль</Label>
                <Select
                  value={formData.target || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      target: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Виберіть ціль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не вказано</SelectItem>
                    {SPELL_TARGET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="damageType">Тип шкоди/ефекту *</Label>
                <Select
                  value={formData.damageType}
                  onValueChange={(value: "damage" | "heal" | "all") =>
                    setFormData({ ...formData, damageType: value, damageModifier: value === "damage" || value === "all" ? formData.damageModifier : null, healModifier: value === "heal" ? formData.healModifier : null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Шкода</SelectItem>
                    <SelectItem value="heal">Лікування</SelectItem>
                    <SelectItem value="all">Усі</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.damageType === "damage" || formData.damageType === "all") && (
                <>
                  <div>
                    <Label>Елемент шкоди</Label>
                    <Select
                      value={formData.damageElement || "none"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          damageElement: value === "none" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Без елементу" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без елементу</SelectItem>
                        {DAMAGE_ELEMENT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Модифікатор шкоди</Label>
                    <Select
                      value={formData.damageModifier || "none"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          damageModifier: value === "none" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Без модифікатора" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без модифікатора</SelectItem>
                        {DAMAGE_MODIFIER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {formData.damageType === "heal" && (
                <div>
                  <Label>Модифікатор лікування</Label>
                  <Select
                    value={formData.healModifier || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        healModifier: value === "none" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Без модифікатора" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без модифікатора</SelectItem>
                      {HEAL_MODIFIER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select
                    value={formData.diceType || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        diceType: value === "none" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Тип кубика" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без кубиків</SelectItem>
                      {DICE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select
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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Виберіть характеристику" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength">Сила</SelectItem>
                      <SelectItem value="dexterity">Спритність</SelectItem>
                      <SelectItem value="constitution">Статура</SelectItem>
                      <SelectItem value="intelligence">Інтелект</SelectItem>
                      <SelectItem value="wisdom">Мудрість</SelectItem>
                      <SelectItem value="charisma">Харизма</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="savingThrowOnSuccess">При успіху</Label>
                  <Select
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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Виберіть ефект" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="half">Половина шкоди</SelectItem>
                      <SelectItem value="none">Без урону</SelectItem>
                    </SelectContent>
                  </Select>
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
                disabled={updateSpellMutation.isPending}
              >
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
