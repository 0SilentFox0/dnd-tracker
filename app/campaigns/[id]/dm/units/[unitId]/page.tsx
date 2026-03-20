"use client";

import { use, useEffect, useRef, useState } from "react";
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
import { UnitAbilityScores } from "@/components/units/form/UnitAbilityScores";
import { UnitAttacks } from "@/components/units/form/UnitAttacks";
import { UnitAvatarInput } from "@/components/units/form/UnitAvatarInput";
import { UnitBasicInfo } from "@/components/units/form/UnitBasicInfo";
import { UnitDamageModifier } from "@/components/units/form/UnitDamageModifier";
import { UnitImmunities } from "@/components/units/form/UnitImmunities";
import { UnitKnownSpells } from "@/components/units/form/UnitKnownSpells";
import { UnitSpecialAbilities } from "@/components/units/form/UnitSpecialAbilities";
import { getSpells } from "@/lib/api/spells";
import { useRaces } from "@/lib/hooks/races";
import { useDeleteUnit, useUnit, useUpdateUnit } from "@/lib/hooks/units";
import type { Spell } from "@/types/spells";
import type { Unit } from "@/types/units";

function buildUnitFormData(unit: Unit): Partial<Unit> {
  const raceValue =
    (unit.race && unit.race.trim()) ||
    (unit.unitGroup?.name as string | undefined) ||
    null;

  return {
    name: unit.name,
    race: raceValue,
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
    minTargets: unit.minTargets,
    maxTargets: unit.maxTargets,
  };
}

function emptyUnitFormDefaults(): Partial<Unit> {
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
    minTargets: 1,
    maxTargets: 1,
  };
}

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

  const [formData, setFormData] = useState<Partial<Unit>>(emptyUnitFormDefaults);

  /** Коли дані з сервера «добудовуються» (race, група), треба знову синхронізувати форму — не лише за unit.id */
  const lastServerSyncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    getSpells(id).then(setSpells).catch(console.error);
  }, [id]);

  // Підтягуємо дані юніта в форму; повторно — якщо змінились раса / група (кеш → повне завантаження)
  useEffect(() => {
    if (!unit) return;

    const syncKey = [
      unit.id,
      unit.race ?? "",
      unit.groupId ?? "",
      unit.unitGroup?.name ?? "",
    ].join("|");

    if (lastServerSyncKeyRef.current === syncKey) return;

    lastServerSyncKeyRef.current = syncKey;
    setFormData(buildUnitFormData(unit)); // eslint-disable-line react-hooks/set-state-in-effect -- sync form from server snapshot
  }, [unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    updateUnitMutation.mutate(
      {
        ...formData,
        knownSpells:
          formData.knownSpells !== undefined
            ? formData.knownSpells
            : unit?.knownSpells ?? [],
        race:
          formData.race !== undefined
            ? formData.race && String(formData.race).trim()
              ? String(formData.race).trim()
              : null
            : (unit?.race?.trim() ?? null),
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
      },
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

            <UnitAttacks
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
