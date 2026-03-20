"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ArtifactModifierDraft } from "./artifact-combat-draft";
import {
  artifactBonusesFromDb,
  type ArtifactEffectScopeDraft,
  artifactEffectScopeDraftFromDb,
  artifactModifierDraftsFromDb,
  buildArtifactBonusesPayload,
  buildArtifactPassiveAbilityPayload,
  passiveSkillEffectsFromDb,
} from "./artifact-combat-draft";
import {
  ArtifactCombatBonusFields,
  buildArtifactModifiersPayload,
} from "./ArtifactCombatBonusFields";
import type { ArtifactData, ArtifactSetOption } from "./ArtifactEditForm-types";
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
  deleteArtifact,
  updateArtifact,
} from "@/lib/api/artifacts";
import {
  ARTIFACT_RARITY_OPTIONS,
  ARTIFACT_SLOT_OPTIONS,
  ArtifactRarity,
} from "@/lib/constants/artifacts";
import type { SkillEffect } from "@/types/battle";

interface ArtifactEditFormProps {
  campaignId: string;
  artifact: ArtifactData;
  artifactSets: ArtifactSetOption[];
}

export function ArtifactEditForm({
  campaignId,
  artifact,
  artifactSets,
}: ArtifactEditFormProps) {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(artifact.name);

  const [description, setDescription] = useState(artifact.description || "");

  const [rarity, setRarity] = useState<string>(
    artifact.rarity || ArtifactRarity.COMMON,
  );

  const [slot, setSlot] = useState<string>(artifact.slot);

  const [icon, setIcon] = useState(artifact.icon || "");

  const [setId, setSetId] = useState<string | null>(artifact.setId);

  const passive = artifact.passiveAbility as Record<string, unknown> | null;

  const [effectName, setEffectName] = useState(
    typeof passive?.name === "string" ? passive.name : "",
  );

  const [effectDescription, setEffectDescription] = useState(
    typeof passive?.description === "string" ? passive.description : "",
  );

  const [bonuses, setBonuses] = useState(() =>
    artifactBonusesFromDb(artifact.bonuses),
  );

  const [modifiers, setModifiers] = useState<ArtifactModifierDraft[]>(() =>
    artifactModifierDraftsFromDb(artifact.modifiers),
  );

  const [passiveEffects, setPassiveEffects] = useState<SkillEffect[]>(() =>
    passiveSkillEffectsFromDb(artifact.passiveAbility),
  );

  const [effectScopeDraft, setEffectScopeDraft] =
    useState<ArtifactEffectScopeDraft>(() =>
      artifactEffectScopeDraftFromDb(artifact.passiveAbility),
    );

  const [skillFxMinT, setSkillFxMinT] = useState("1");

  const [skillFxMaxT, setSkillFxMaxT] = useState("1");

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
        passive ?? null,
        effectScopeDraft,
      );

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        rarity,
        slot,
        icon: icon.trim() || null,
        setId: setId || null,
        bonuses: buildArtifactBonusesPayload(bonuses),
        modifiers: buildArtifactModifiersPayload(modifiers),
        passiveAbility,
      };

      await updateArtifact(campaignId, artifact.id, payload);

      router.push(`/campaigns/${campaignId}/dm/artifacts`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка оновлення";

      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Ви впевнені, що хочете видалити цей артефакт?")) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteArtifact(campaignId, artifact.id);

      router.push(`/campaigns/${campaignId}/dm/artifacts`);
      router.refresh();
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
        <CardTitle>Редагувати артефакт</CardTitle>
        <CardDescription>
          Зміни зберігаються при натисканні кнопки
        </CardDescription>
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
            <p className="text-xs text-muted-foreground">
              Нове зовнішнє посилання при збереженні завантажується в бакет{" "}
              <code className="text-xs bg-muted px-1 rounded">artifact-icons</code>
              . URL уже з Supabase залишається без змін.
            </p>
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
              idPrefix="artifact-edit"
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
            <Button type="submit" disabled={isSaving || isDeleting}>
              {isSaving ? "Збереження..." : "Зберегти"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/campaigns/${campaignId}/dm/artifacts`)
              }
              disabled={isSaving || isDeleting}
            >
              Скасувати
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              className="ml-auto"
            >
              {isDeleting ? "Видалення..." : "Видалити"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
