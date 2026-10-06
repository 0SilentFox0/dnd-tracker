"use client";

import Link from "next/link";

import { ARTIFACT_SET_FORM_TAB, type ArtifactSetFormTabId } from "./artifact-set-form-tabs";
import { ArtifactSetMembersPicker } from "./ArtifactSetMembersPicker";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { HudForm, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useArtifactSetForm } from "@/lib/hooks/artifact-sets";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";
import type { Ability } from "@/lib/utils/abilities/schema";

export interface ArtifactSetFormProps {
  campaignId: string;
  setId?: string;
  initialName?: string;
  initialDescription?: string | null;
  initialIcon?: string | null;
  initialSetBonus?: { name?: string; description?: string };
  initialAbilities?: Ability[];
  initialAbilityIssues?: ConversionIssue[];
  initialArtifactIds?: string[];
}

export function ArtifactSetForm({
  campaignId,
  setId,
  initialName = "",
  initialDescription = "",
  initialIcon = "",
  initialSetBonus = {},
  initialAbilities = [],
  initialAbilityIssues = [],
  initialArtifactIds = [],
}: ArtifactSetFormProps) {
  const form = useArtifactSetForm({
    campaignId,
    setId,
    initial: {
      name: initialName,
      description: initialDescription,
      icon: initialIcon,
      setBonus: initialSetBonus,
      abilities: initialAbilities,
      artifactIds: initialArtifactIds,
    },
  });

  const { fields, setField } = form;

  const tabs: HudTab<ArtifactSetFormTabId>[] = [
    {
      id: ARTIFACT_SET_FORM_TAB.basic,
      label: "Основне",
      content: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="set-name">Назва сету *</Label>
            <Input
              id="set-name"
              value={fields.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              maxLength={120}
              placeholder="Наприклад, Спадщина дракона"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="set-desc">Опис (для довідки)</Label>
            <Textarea
              id="set-desc"
              value={fields.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              placeholder="Коротко про призначення сету"
            />
          </div>

          <div className="space-y-2">
            <ImageUpload value={fields.icon} onChange={(v) => setField("icon", v)} label="Іконка для бою" fallbackText={fields.name} />
            <p className="text-xs text-muted-foreground">
              Показується біля портрета в битві при повному сеті. Завантажений файл
              зберігається в сховищі кампанії (як іконки артефактів), у базі лишається
              посилання.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="set-bonus-name">Назва бонусу</Label>
              <Input id="set-bonus-name" value={fields.bonusName} onChange={(e) => setField("bonusName", e.target.value)} placeholder="Наприклад, Кров дракона" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-bonus-desc">Опис бонусу</Label>
              <Textarea id="set-bonus-desc" value={fields.bonusDescription} onChange={(e) => setField("bonusDescription", e.target.value)} rows={2} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: ARTIFACT_SET_FORM_TAB.members,
      label: "Предмети",
      content: <ArtifactSetMembersPicker artifacts={form.selectableArtifacts} selectedIds={form.selectedIds} onToggle={form.toggleArtifact} />,
    },
    {
      id: ARTIFACT_SET_FORM_TAB.abilities,
      label: "Вміння",
      invalid: form.abilityErrors > 0 || initialAbilityIssues.length > 0,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          value={fields.abilities}
          onChange={(a) => setField("abilities", a)}
          issues={initialAbilityIssues}
          onValidityChange={(_, n) => form.setAbilityErrors(n)}
        />
      ),
    },
  ];

  return (
    <>
      {form.error && (
        <p role="alert" className="mx-4 mt-3 rounded-md border border-[#d0705c]/50 bg-[#d0705c]/10 px-3 py-2 text-sm text-[#f0b4a6]">
          {form.error}
        </p>
      )}
      <HudForm
        id="artifact-set-form"
        onSubmit={form.submit}
        tabs={tabs}
        actions={
          <>
            {setId && (
              <Button type="button" variant="destructive" disabled={form.isBusy} onClick={() => void form.remove()}>
                Видалити сет
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${campaignId}/dm/artifact-sets`}>Скасувати</Link>
            </Button>
            <Button type="submit" disabled={form.isBusy || !fields.name.trim() || !form.abilitiesValid}>
              {form.isBusy ? "Збереження…" : withAbilityErrors(setId ? "Зберегти зміни" : "Створити сет", form.abilityErrors)}
            </Button>
          </>
        }
      />
    </>
  );
}
