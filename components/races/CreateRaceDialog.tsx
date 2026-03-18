"use client";

import { useState } from "react";

import { RaceEditFormSpellSlots } from "./RaceEditFormSpellSlots";
import { RaceEditFormStatModifiers } from "./RaceEditFormStatModifiers";

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
import { Textarea } from "@/components/ui/textarea";
import { useMainSkills } from "@/lib/hooks/skills";
import type { RaceFormData } from "@/types/races";

interface CreateRaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onCreateRace: (data: RaceFormData) => void;
}

export function CreateRaceDialog({
  open,
  onOpenChange,
  campaignId,
  onCreateRace,
}: CreateRaceDialogProps) {
  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const [formData, setFormData] = useState<RaceFormData>({
    name: "",
    availableSkills: [],
    disabledSkills: [], // Залишаємо для сумісності, але не використовуємо
    passiveAbility: {
      description: "",
      statImprovements: "",
      statModifiers: {},
    },
    spellSlotProgression: [
      { level: 1, slots: 0 },
      { level: 2, slots: 0 },
      { level: 3, slots: 0 },
      { level: 4, slots: 0 },
      { level: 5, slots: 0 },
    ],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRace(formData);
    // Скидаємо форму
    setFormData({
      name: "",
      availableSkills: [],
      disabledSkills: [], // Залишаємо для сумісності
      passiveAbility: {
        description: "",
        statImprovements: "",
        statModifiers: {},
      },
    });
  };

  const toggleAvailableSkill = (skillId: string) => {
    setFormData((prev) => {
      const isSelected = prev.availableSkills.includes(skillId);

      const newAvailable = isSelected
        ? prev.availableSkills.filter((id) => id !== skillId)
        : [...prev.availableSkills, skillId];

      return {
        ...prev,
        availableSkills: newAvailable,
        // disabledSkills завжди порожній, оскільки всі невказані автоматично недоступні
        disabledSkills: [],
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Створити расу</DialogTitle>
          <DialogDescription>
            Заповніть інформацію про расу та її здібності
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва раси *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              placeholder="Наприклад: Люди, Ельфи, Демони"
            />
          </div>

          <div className="space-y-2">
            <Label>Доступні скіли для прокачки</Label>
            <p className="text-xs text-muted-foreground">
              Виберіть основні навики, які будуть доступні для прокачки цієї
              раси. Всі невказані навики будуть недоступні.
            </p>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
              {mainSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Немає доступних основних навиків. Створіть їх в розділі
                  &quot;Основні Навики&quot;.
                </p>
              ) : (
                <div className="space-y-2">
                  {mainSkills.map((mainSkill) => (
                    <label
                      key={mainSkill.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.availableSkills.includes(
                          mainSkill.id,
                        )}
                        onChange={() => toggleAvailableSkill(mainSkill.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{mainSkill.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passiveDescription">Опис пасивної здібності</Label>
            <Textarea
              id="passiveDescription"
              value={formData.passiveAbility?.description || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  passiveAbility: {
                    ...prev.passiveAbility,
                    description: e.target.value,
                    statImprovements:
                      prev.passiveAbility?.statImprovements || "",
                  },
                }))
              }
              placeholder="Наприклад: Імунітет до вогню, Мораль завжди >= 0"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Модифікатори характеристик</Label>
            <p className="text-xs text-muted-foreground">
              Виберіть ефекти для кожної характеристики
            </p>
            <RaceEditFormStatModifiers formData={formData} setFormData={setFormData} />
          </div>

          <div className="space-y-2">
            <Label>Прокачка магічних слотів</Label>
            <p className="text-xs text-muted-foreground">
              Вкажіть максимальну кількість магічних слотів для кожного рівня
              магії при прокачці рівня персонажа
            </p>
            <RaceEditFormSpellSlots formData={formData} setFormData={setFormData} />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Скасувати
            </Button>
            <Button type="submit">Створити расу</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
