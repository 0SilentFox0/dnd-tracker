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

import type { ArtifactModifierDraft } from "./artifact-combat-draft";
import {
  type ArtifactEffectScopeDraft,
  buildArtifactBonusesPayload,
  buildArtifactPassiveAbilityPayload,
} from "./artifact-combat-draft";
import {
  ArtifactCombatBonusFields,
  buildArtifactModifiersPayload,
} from "./ArtifactCombatBonusFields";
import { ArtifactEffectScopeFields } from "./ArtifactEffectScopeFields";
import { ArtifactIconUrlPreview } from "./ArtifactIconUrlPreview";

import { SkillEffectsEditor } from "@/components/skills/form/effects/SkillEffectsEditor";
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
import {
  ARTIFACT_RARITY_OPTIONS,
  ARTIFACT_SLOT_OPTIONS,
} from "@/lib/constants/artifacts";
import type { SkillEffect } from "@/types/battle";

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
  effectName: string;
  effectDescription: string;
  bonuses: Record<string, number>;
  modifiers: ArtifactModifierDraft[];
  passiveEffects: SkillEffect[];
  effectScopeDraft: ArtifactEffectScopeDraft;
  /** Існуюча passive payload — щоб merge-ити при збереженні (для Edit режиму). */
  existingPassive?: Record<string, unknown> | null;
}

export interface ArtifactFormSubmitPayload {
  name: string;
  description: string | null | undefined;
  rarity: string;
  slot: string;
  icon: string | null;
  setId: string | null | undefined;
  bonuses: ReturnType<typeof buildArtifactBonusesPayload>;
  modifiers: ReturnType<typeof buildArtifactModifiersPayload>;
  passiveAbility: ReturnType<typeof buildArtifactPassiveAbilityPayload>;
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
  /** Префікс для id-атрибутів (для unique input ids на одній сторінці). */
  idPrefix: string;
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
  idPrefix,
  submitLabel,
  submitLabelSaving,
  onSubmit,
  onDelete,
  cancelHref,
  iconHint,
}: ArtifactFormProps) {
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

  const [effectName, setEffectName] = useState(initial.effectName);

  const [effectDescription, setEffectDescription] = useState(
    initial.effectDescription,
  );

  const [bonuses, setBonuses] = useState(initial.bonuses);

  const [modifiers, setModifiers] = useState<ArtifactModifierDraft[]>(
    initial.modifiers,
  );

  const [passiveEffects, setPassiveEffects] = useState<SkillEffect[]>(
    initial.passiveEffects,
  );

  const [effectScopeDraft, setEffectScopeDraft] =
    useState<ArtifactEffectScopeDraft>(initial.effectScopeDraft);

  const [skillFxMinT, setSkillFxMinT] = useState("1");

  const [skillFxMaxT, setSkillFxMaxT] = useState("1");

  const isBusy = isSaving || isDeleting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const passiveAbility = buildArtifactPassiveAbilityPayload(
        effectName,
        effectDescription,
        passiveEffects,
        initial.existingPassive ?? null,
        effectScopeDraft,
      );

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
        bonuses: buildArtifactBonusesPayload(bonuses),
        modifiers: buildArtifactModifiersPayload(modifiers),
        passiveAbility,
      };

      await onSubmit(payload);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : mode === "edit"
            ? "Помилка оновлення"
            : "Помилка створення";

      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (!confirm("Ви впевнені, що хочете видалити цей артефакт?")) return;

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

          <ArtifactCombatBonusFields
            bonuses={bonuses}
            onBonusesChange={setBonuses}
            modifiers={modifiers}
            onModifiersChange={setModifiers}
          />

          <div className="rounded-md border p-4 space-y-3">
            <p className="text-sm font-semibold">Пасив артефакту</p>
            {mode === "create" && (
              <p className="text-xs text-muted-foreground">
                Назва та опис — для довідки. Нижче — ефекти як у пасивного
                скіла (резисти, HP, слоти 4–5, перевага…).
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="artifact-effect-name">Назва ефекту</Label>
              <Input
                id="artifact-effect-name"
                value={effectName}
                onChange={(e) => setEffectName(e.target.value)}
                placeholder="Наприклад: Полум'я Сар Ісси"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-effect-description">Опис ефекту</Label>
              <Textarea
                id="artifact-effect-description"
                value={effectDescription}
                onChange={(e) => setEffectDescription(e.target.value)}
                placeholder="Опис ефекту артефакту"
                rows={3}
              />
            </div>
            <ArtifactEffectScopeFields
              campaignId={campaignId}
              value={effectScopeDraft}
              onChange={setEffectScopeDraft}
              idPrefix={idPrefix}
            />
            <SkillEffectsEditor
              effects={passiveEffects}
              minTargets={skillFxMinT}
              maxTargets={skillFxMaxT}
              onEffectsChange={setPassiveEffects}
              onMinTargetsChange={setSkillFxMinT}
              onMaxTargetsChange={setSkillFxMaxT}
              hideTargeting
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isBusy}>
              {isSaving ? submitLabelSaving : submitLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(cancelHref)}
              disabled={isBusy}
            >
              Скасувати
            </Button>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isBusy}
                className="ml-auto"
              >
                {isDeleting ? "Видалення..." : "Видалити"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
