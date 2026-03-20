"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ArtifactModifierDraft } from "./artifact-combat-draft";
import {
  type ArtifactEffectScopeDraft,
  buildArtifactBonusesPayload,
  buildArtifactPassiveAbilityPayload,
  emptyArtifactBonusesRecord,
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
import { createArtifact } from "@/lib/api/artifacts";
import {
  ARTIFACT_RARITY_OPTIONS,
  ARTIFACT_SLOT_OPTIONS,
  ArtifactRarity,
  ArtifactSlot,
} from "@/lib/constants/artifacts";
import type { SkillEffect } from "@/types/battle";

interface ArtifactSetOption {
  id: string;
  name: string;
}

interface ArtifactCreateFormProps {
  campaignId: string;
  artifactSets: ArtifactSetOption[];
}

export function ArtifactCreateForm({
  campaignId,
  artifactSets,
}: ArtifactCreateFormProps) {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [rarity, setRarity] = useState<string>(ArtifactRarity.COMMON);

  const [slot, setSlot] = useState<string>(ArtifactSlot.ITEM);

  const [icon, setIcon] = useState("");

  const [setId, setSetId] = useState<string | null>(null);

  const [effectName, setEffectName] = useState("");

  const [effectDescription, setEffectDescription] = useState("");

  const [bonuses, setBonuses] = useState(() => emptyArtifactBonusesRecord());

  const [modifiers, setModifiers] = useState<ArtifactModifierDraft[]>([]);

  const [passiveEffects, setPassiveEffects] = useState<SkillEffect[]>([]);

  const [effectScopeDraft, setEffectScopeDraft] =
    useState<ArtifactEffectScopeDraft>({
      audience: "",
      immuneSpellIds: [],
    });

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
        null,
        effectScopeDraft,
      );

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        rarity,
        slot,
        icon: icon.trim() || null,
        setId: setId || undefined,
        bonuses: buildArtifactBonusesPayload(bonuses),
        modifiers: buildArtifactModifiersPayload(modifiers),
        passiveAbility: passiveAbility ?? undefined,
      };

      await createArtifact(campaignId, payload);

      router.push(`/campaigns/${campaignId}/dm/artifacts`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка створення";

      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Створити артефакт</CardTitle>
        <CardDescription>
          Бойові бонуси, модифікатори зброї та пасивні ефекти (як у скілів)
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
              Зовнішнє посилання при збереженні копіюється в Supabase Storage (бакет{" "}
              <code className="text-xs bg-muted px-1 rounded">artifact-icons</code>
              ); у базі залишиться публічний URL з вашого проєкту.
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
            <p className="text-xs text-muted-foreground">
              Назва та опис — для довідки. Нижче — ефекти як у пасивного скіла
              (резисти, HP, слоти 4–5, перевага…).
            </p>
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
              idPrefix="artifact-create"
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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Створення..." : "Створити артефакт"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/campaigns/${campaignId}/dm/artifacts`)
              }
              disabled={isSaving}
            >
              Скасувати
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
