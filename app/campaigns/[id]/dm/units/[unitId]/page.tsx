"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  useUnit,
  useUpdateUnit,
  useDeleteUnit,
} from "@/lib/hooks/useUnits";
import { useRaces } from "@/lib/hooks/useRaces";
import type { Unit } from "@/types/units";
import type { Spell } from "@/types/spells";
import { getSpells } from "@/lib/api/spells";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { UnitBasicInfo } from "@/components/units/UnitBasicInfo";
import { UnitAbilityScores } from "@/components/units/UnitAbilityScores";
import { UnitAvatarInput } from "@/components/units/UnitAvatarInput";
import { UnitDamageModifier } from "@/components/units/UnitDamageModifier";
import { UnitImmunities } from "@/components/units/UnitImmunities";
import { UnitSpecialAbilities } from "@/components/units/UnitSpecialAbilities";
import { UnitKnownSpells } from "@/components/units/UnitKnownSpells";

export default function EditUnitPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = use(params);
  const router = useRouter();
  const { data: unit, isLoading: fetching } = useUnit(id, unitId);
  const { data: races = [] } = useRaces(id);
  const updateUnitMutation = useUpdateUnit(id, unitId);
  const deleteUnitMutation = useDeleteUnit(id);
  const [spells, setSpells] = useState<Spell[]>([]);

  // Використовуємо useMemo для обчислення початкових даних форми
  const initialFormData = useMemo<Partial<Unit>>(() => {
    if (unit) {
      return {
        name: unit.name,
        race: unit.race || null,
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
        immunities: Array.isArray(unit.immunities) ? unit.immunities : [],
        knownSpells: Array.isArray(unit.knownSpells) ? unit.knownSpells : [],
        groupId: unit.groupId || null,
        avatar: unit.avatar || null,
        damageModifier: unit.damageModifier || null,
      };
    }
    return {
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
      immunities: [],
      knownSpells: [],
      avatar: null,
      damageModifier: null,
      race: null,
    };
  }, [unit]);

  // Використовуємо lazy initialization для useState
  const [formData, setFormData] = useState<Partial<Unit>>(
    () => initialFormData
  );

  useEffect(() => {
    getSpells(id).then(setSpells).catch(console.error);
  }, [id]);

  // Оновлюємо formData коли initialFormData змінюється (через key prop форма автоматично скидається)
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    updateUnitMutation.mutate(
      {
        ...formData,
        avatar:
          formData.avatar === undefined ? undefined : formData.avatar || null,
        damageModifier:
          formData.damageModifier === undefined
            ? undefined
            : formData.damageModifier,
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

  const handleFormDataChange = (updates: Partial<Unit>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
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
          <form key={unitId} onSubmit={handleSubmit} className="space-y-6">
            <UnitBasicInfo
              formData={formData}
              races={races}
              onChange={handleFormDataChange}
            />

            <UnitAbilityScores
              formData={formData}
              onChange={handleFormDataChange}
            />

            <UnitAvatarInput
              formData={formData}
              onChange={handleFormDataChange}
            />

            <UnitDamageModifier
              formData={formData}
              onChange={handleFormDataChange}
            />

            <UnitImmunities
              formData={formData}
              race={
                formData.race
                  ? races.find((r) => r.name === formData.race) || null
                  : null
              }
              onChange={handleFormDataChange}
            />

            <UnitSpecialAbilities
              formData={formData}
              spells={spells}
              onChange={(abilities) =>
                handleFormDataChange({
                  specialAbilities: abilities as Unit["specialAbilities"],
                })
              }
            />

            <UnitKnownSpells
              formData={formData}
              spells={spells}
              onChange={handleFormDataChange}
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={updateUnitMutation.isPending}>
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
