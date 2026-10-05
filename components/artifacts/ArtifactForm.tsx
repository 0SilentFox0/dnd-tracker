"use client";

/**
 * Універсальна форма артефакту: і Create, і Edit.
 *
 * 95% полів і логіки спільні для обох режимів, тому вони тут.
 * `ArtifactCreateForm` і `ArtifactEditForm` стають тонкими обгортками
 * що передають initial values + onSubmit + (опційно) onDelete.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ArtifactIconUrlPreview } from "./ArtifactIconUrlPreview";
import { ArtifactWeaponFields } from "./ArtifactWeaponFields";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { ActionBar } from "@/components/common/ActionBar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import {
  ARTIFACT_RARITY_OPTIONS,
  ARTIFACT_SLOT_OPTIONS,
} from "@/lib/constants/artifacts";
import { abilitySaveError } from "@/lib/hooks/abilities";
import { useConfirm } from "@/lib/hooks/common";
import type { ConversionIssue } from "@/lib/utils/abilities/legacy/types";
import type { Ability } from "@/lib/utils/abilities/schema";
import { isWeaponSlot, type WeaponStats } from "@/lib/utils/artifacts/weapon-stats";

export interface ArtifactSetOption {
  id: string;
  name: string;
}

/** Початковий стан усіх полів форми. */
export interface ArtifactFormInitial {
  name: string;
  description: string;
  rarity: string;
  slot: string;
  icon: string;
  setId: string | null;
  abilities: Ability[];
  abilityIssues: ConversionIssue[];
  weapon?: WeaponStats;
}

export interface ArtifactFormSubmitPayload {
  name: string;
  description: string | null | undefined;
  rarity: string;
  slot: string;
  icon: string | null;
  setId: string | null | undefined;
  abilities: Ability[];
  weapon?: WeaponStats;
}

export interface ArtifactFormProps {
  campaignId: string;
  artifactSets: ArtifactSetOption[];
  initial: ArtifactFormInitial;
  /** "create" — без кнопки видалити; "edit" — з нею. */
  mode: "create" | "edit";
  /** Заголовок картки. */
  title: string;
  /** Опис під заголовком. */
  description?: string;
  /** Лейбл submit-кнопки під час норм. стану. */
  submitLabel: string;
  /** Лейбл під час saving. */
  submitLabelSaving: string;
  /** Колбек при сабміті — отримує payload, що готовий для API. */
  onSubmit: (payload: ArtifactFormSubmitPayload) => Promise<void>;
  /** Опційний колбек видалення (Edit режим). */
  onDelete?: () => Promise<void>;
  /** Шлях для кнопки "Скасувати" — куди повертатись. */
  cancelHref: string;
  /** Підказка під полем іконки (Create vs Edit формулюється різно). */
  iconHint: React.ReactNode;
}

export function ArtifactForm({
  campaignId,
  artifactSets,
  initial,
  mode,
  title,
  description: cardDescription,
  submitLabel,
  submitLabelSaving,
  onSubmit,
  onDelete,
  cancelHref,
  iconHint,
}: ArtifactFormProps) {
  const confirm = useConfirm();

  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial.name);

  const [description, setDescription] = useState(initial.description);

  const [rarity, setRarity] = useState<string>(initial.rarity);

  const [slot, setSlot] = useState<string>(initial.slot);

  const [icon, setIcon] = useState(initial.icon);

  const [setId, setSetId] = useState<string | null>(initial.setId);

  const [abilities, setAbilities] = useState<Ability[]>(initial.abilities);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const abilitiesValid = abilityErrors === 0;

  const [weapon, setWeapon] = useState<WeaponStats>(initial.weapon ?? {});

  const isBusy = isSaving || isDeleting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !abilitiesValid) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload: ArtifactFormSubmitPayload = {
        name: name.trim(),
        description:
          mode === "edit"
            ? description.trim() || null
            : description.trim() || undefined,
        rarity,
        slot,
        icon: icon.trim() || null,
        setId: mode === "edit" ? setId || null : setId || undefined,
        abilities,
        ...(isWeaponSlot(slot) && { weapon }),
      };

      await onSubmit(payload);
    } catch (err) {
      setError(abilitySaveError(err, mode === "edit" ? "Помилка оновлення" : "Помилка створення"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (!(await confirm({ title: "Ви впевнені, що хочете видалити цей артефакт?", confirmLabel: "Видалити", destructive: true }))) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка видалення";

      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {cardDescription && (
          <CardDescription>{cardDescription}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledInput
              id="artifact-name"
              label="Назва"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Кільце Сар Ісси"
              required
            />
            <div className="space-y-2">
              <Label htmlFor="artifact-rarity">Рідкість</Label>
              <SelectField
                id="artifact-rarity"
                value={rarity}
                onValueChange={setRarity}
                placeholder="Виберіть рідкість"
                options={ARTIFACT_RARITY_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-slot">Слот</Label>
              <SelectField
                id="artifact-slot"
                value={slot}
                onValueChange={setSlot}
                placeholder="Виберіть слот"
                options={ARTIFACT_SLOT_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-set">Сет</Label>
              <SelectField
                id="artifact-set"
                value={setId || ""}
                onValueChange={(value) => setSetId(value || null)}
                placeholder="Без сету"
                options={artifactSets.map((set) => ({
                  value: set.id,
                  label: set.name,
                }))}
                allowNone
                noneLabel="Без сету"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="artifact-description">Опис</Label>
            <Textarea
              id="artifact-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткий опис артефакту"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <LabeledInput
              id="artifact-icon"
              label="Іконка (URL з інтернету)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="https://example.com/icon.png"
            />
            <p className="text-xs text-muted-foreground">{iconHint}</p>
            <ArtifactIconUrlPreview key={icon.trim()} url={icon} />
          </div>

          {isWeaponSlot(slot) && <ArtifactWeaponFields value={weapon} onChange={setWeapon} />}

          <AbilityListEditor
            campaignId={campaignId}
            value={abilities}
            onChange={setAbilities}
            issues={initial.abilityIssues}
            onValidityChange={(_, n) => setAbilityErrors(n)}
          />

          <ActionBar>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isBusy}
                className=""
              >
                {isDeleting ? "Видалення..." : "Видалити"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(cancelHref)}
              disabled={isBusy}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={isBusy || !abilitiesValid}>
              {isSaving ? submitLabelSaving : withAbilityErrors(submitLabel, abilityErrors)}
            </Button>
          </ActionBar>
        </form>
      </CardContent>
    </Card>
  );
}
