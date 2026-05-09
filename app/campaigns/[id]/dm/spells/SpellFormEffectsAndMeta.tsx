"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

import type { SpellFormData } from "./spell-form-defaults";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { SPELL_EFFECT_GROUPS } from "@/lib/constants/spell-effects";
import { useUnits } from "@/lib/hooks/units";

export interface SpellFormEffectsAndMetaProps {
  campaignId: string;
  formData: SpellFormData;
  setFormData: (data: SpellFormData | ((prev: SpellFormData) => SpellFormData)) => void;
  isSubmitting: boolean;
  submitLabel: string;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function SpellFormEffectsAndMeta({
  campaignId,
  formData,
  setFormData,
  isSubmitting,
  submitLabel,
  onDelete,
  isDeleting,
}: SpellFormEffectsAndMetaProps) {
  const { data: units = [], isLoading: unitsLoading } = useUnits(campaignId);

  const unitOptions = useMemo(
    () => units.map((u) => ({ value: u.id, label: u.name })),
    [units],
  );

  const summonEnabled = Boolean(
    formData.summonUnitId && String(formData.summonUnitId).length > 0,
  );

  return (
    <>
      <div>
        <Label>Ефекти</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Виберіть ефекти зі списку. Кожен ефект зберігається окремо.
        </p>
        <div className="flex gap-2 mb-3">
          {(() => {
            const alreadyAdded = new Set(formData.effects ?? []);

            const availableGroups = SPELL_EFFECT_GROUPS.map((g) => ({
              label: g.label,
              options: g.options.filter((opt) => !alreadyAdded.has(opt.value)),
            })).filter((g) => g.options.length > 0);

            const totalAvailable = availableGroups.reduce(
              (sum, g) => sum + g.options.length,
              0,
            );

            return totalAvailable > 0 ? (
              <SelectField
                value=""
                onValueChange={(value) => {
                  if (!value) return;

                  const current = formData.effects ?? [];

                  if (current.includes(value)) return;

                  setFormData({ ...formData, effects: [...current, value] });
                }}
                placeholder="Додати ефект..."
                groups={availableGroups}
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
                  const next = (formData.effects ?? []).filter(
                    (_, i) => i !== idx,
                  );

                  setFormData({ ...formData, effects: next });
                }}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
        {(formData.effects ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Ефекти не додано
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="spell-summon-unit"
            checked={summonEnabled}
            onCheckedChange={(checked) => {
              if (checked === true) {
                const firstId = unitOptions[0]?.value ?? null;

                setFormData({
                  ...formData,
                  summonUnitId: firstId,
                });
              } else {
                setFormData({ ...formData, summonUnitId: null });
              }
            }}
          />
          <Label htmlFor="spell-summon-unit" className="font-medium cursor-pointer">
            Прикликає юніта на поле бою
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Після успішного касту (не промах по перевірці попадання, є слот магії)
          обраний юніт з бібліотеки з&apos;являється на стороні кастера в{" "}
          <strong>кінці</strong> поточної черги ініціативи.
        </p>
        {summonEnabled && (
          <SelectField
            id="spell-summon-unit-select"
            value={formData.summonUnitId || ""}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                summonUnitId: value || null,
              })
            }
            placeholder={
              unitsLoading
                ? "Завантаження юнітів..."
                : unitOptions.length === 0
                  ? "Немає юнітів у кампанії"
                  : "Оберіть юніта"
            }
            options={unitOptions}
            disabled={unitsLoading || unitOptions.length === 0}
            allowNone
            noneLabel="Не обрано"
          />
        )}
      </div>

      <div>
        <Label htmlFor="description">Опис (опційно)</Label>
        <Textarea
          id="description"
          value={formData.description ?? ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value || null,
            })
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Збереження..." : submitLabel}
        </Button>
        {onDelete != null && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Видалення..." : "Видалити"}
          </Button>
        )}
        <Link href={`/campaigns/${campaignId}/dm/spells`}>
          <Button type="button" variant="outline">
            Скасувати
          </Button>
        </Link>
      </div>
    </>
  );
}
