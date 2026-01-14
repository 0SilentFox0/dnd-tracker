"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  useUnit,
  useUnitGroups,
  useUpdateUnit,
  useDeleteUnit,
} from "@/lib/hooks/useUnits";
import type { Unit, UnitGroup } from "@/lib/api/units";
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

export default function EditUnitPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = use(params);
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<Unit>>({
    name: "",
    level: 1,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 10,
    initiative: 0,
    speed: 30,
    maxHp: 10,
    proficiencyBonus: 2,
    attacks: [],
    specialAbilities: [],
    knownSpells: [],
    groupId: null,
    avatar: null,
  });

  const { data: unit, isLoading: fetching } = useUnit(id, unitId);
  const { data: unitGroups = [] } = useUnitGroups(id);
  const updateUnitMutation = useUpdateUnit(id, unitId);
  const deleteUnitMutation = useDeleteUnit(id);

  // Оновлюємо formData коли unit завантажиться
  useEffect(() => {
    if (unit) {
      setFormData((prev) => ({
        ...prev,
        name: unit.name,
        level: unit.level,
        strength: unit.strength,
        dexterity: unit.dexterity,
        constitution: unit.constitution,
        intelligence: unit.intelligence,
        wisdom: unit.wisdom,
        charisma: unit.charisma,
        armorClass: unit.armorClass,
        initiative: unit.initiative,
        speed: unit.speed,
        maxHp: unit.maxHp,
        proficiencyBonus: unit.proficiencyBonus,
        attacks: Array.isArray(unit.attacks) ? unit.attacks : [],
        specialAbilities: Array.isArray(unit.specialAbilities)
          ? unit.specialAbilities
          : [],
        knownSpells: Array.isArray(unit.knownSpells) ? unit.knownSpells : [],
        groupId: unit.groupId || null,
        avatar: unit.avatar || null,
      }));
    }
  }, [unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    updateUnitMutation.mutate(
      {
        ...formData,
        groupId: formData.groupId === undefined ? undefined : (formData.groupId || null),
        avatar: formData.avatar === undefined ? undefined : (formData.avatar || null),
      },
      {
        onSuccess: () => {
          router.push(`/campaigns/${id}/dm/units`);
        },
        onError: (error) => {
          console.error("Error updating unit:", error);
        },
      }
    );
  };

  const handleDelete = async () => {
    if (!confirm("Ви впевнені, що хочете видалити цього юніта?")) {
      return;
    }

    deleteUnitMutation.mutate(unitId, {
      onSuccess: () => {
        router.push(`/campaigns/${id}/dm/units`);
      },
      onError: (error) => {
        console.error("Error deleting unit:", error);
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <Link href={`/campaigns/${id}/dm/units`}>
          <Button variant="ghost">← Назад</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Редагувати юніта: {formData.name}</CardTitle>
          <CardDescription>Оновіть інформацію про юніта</CardDescription>
        </CardHeader>
        <CardContent>
          {(updateUnitMutation.error || deleteUnitMutation.error) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Помилка:</strong>
              <span className="block sm:inline">
                {" "}
                {(updateUnitMutation.error as Error)?.message ||
                  (deleteUnitMutation.error as Error)?.message ||
                  "Помилка"}
              </span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Назва юніта *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="Назва юніта"
                />
              </div>

              <div>
                <Label htmlFor="groupId">Група юнітів</Label>
                <Select
                  key={`group-select-${formData.groupId || "none"}-${unitGroups.length}`}
                  value={formData.groupId ? String(formData.groupId) : "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      groupId: value === "none" ? null : value,
                    })
                  }
                  disabled={unitGroups.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={unitGroups.length === 0 ? "Завантаження..." : "Виберіть групу"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без групи</SelectItem>
                    {unitGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.groupId && unitGroups.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Поточна група: {unitGroups.find((g) => g.id === formData.groupId)?.name || "Не знайдено"}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="level">Рівень *</Label>
                <Input
                  id="level"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      level: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="armorClass">Клас броні *</Label>
                <Input
                  id="armorClass"
                  type="number"
                  min="0"
                  value={formData.armorClass}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      armorClass: parseInt(e.target.value) || 10,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="maxHp">Максимальне HP *</Label>
                <Input
                  id="maxHp"
                  type="number"
                  min="1"
                  value={formData.maxHp}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxHp: parseInt(e.target.value) || 10,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="speed">Швидкість *</Label>
                <Input
                  id="speed"
                  type="number"
                  min="0"
                  value={formData.speed}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      speed: parseInt(e.target.value) || 30,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="initiative">Ініціатива</Label>
                <Input
                  id="initiative"
                  type="number"
                  value={formData.initiative}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      initiative: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="proficiencyBonus">Бонус майстерності</Label>
                <Input
                  id="proficiencyBonus"
                  type="number"
                  min="0"
                  value={formData.proficiencyBonus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      proficiencyBonus: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="strength">Сила</Label>
                <Input
                  id="strength"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.strength}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      strength: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="dexterity">Спритність</Label>
                <Input
                  id="dexterity"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.dexterity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dexterity: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="constitution">Статура</Label>
                <Input
                  id="constitution"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.constitution}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      constitution: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="intelligence">Інтелект</Label>
                <Input
                  id="intelligence"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.intelligence}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      intelligence: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="wisdom">Мудрість</Label>
                <Input
                  id="wisdom"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.wisdom}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wisdom: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="charisma">Харизма</Label>
                <Input
                  id="charisma"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.charisma}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      charisma: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="avatar">Посилання на картинку</Label>
              <Input
                id="avatar"
                type="url"
                value={formData.avatar || ""}
                onChange={(e) =>
                  setFormData({ ...formData, avatar: e.target.value || null })
                }
                placeholder="https://example.com/unit-avatar.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Введіть URL картинки з інтернету
              </p>
              {formData.avatar && (
                <div className="mt-3">
                  <Label>Попередній перегляд:</Label>
                  <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden bg-muted border">
                    <img
                      src={formData.avatar}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={updateUnitMutation.isPending}
              >
                {updateUnitMutation.isPending
                  ? "Збереження..."
                  : "Зберегти зміни"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteUnitMutation.isPending}
              >
                {deleteUnitMutation.isPending ? "Видалення..." : "Видалити"}
              </Button>
              <Link href={`/campaigns/${id}/dm/units`}>
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
