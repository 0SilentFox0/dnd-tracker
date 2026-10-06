"use client";

import Link from "next/link";

import { ArtifactSetMembersPicker } from "./ArtifactSetMembersPicker";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { ActionBar } from "@/components/common/ActionBar";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useArtifactSetForm } from "@/lib/hooks/artifact-sets";
import type { ConversionIssue } from "@/lib/utils/abilities/legacy/types";
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

  return (
    <form onSubmit={form.submit} className="space-y-6 max-w-3xl">
      {form.error && (
        <p className="text-sm text-destructive border border-destructive/50 rounded-md p-3">
          {form.error}
        </p>
      )}

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

      <AbilityListEditor
        campaignId={campaignId}
        value={fields.abilities}
        onChange={(a) => setField("abilities", a)}
        issues={initialAbilityIssues}
        onValidityChange={(_, n) => form.setAbilityErrors(n)}
      />

      <ArtifactSetMembersPicker
        artifacts={form.selectableArtifacts}
        selectedIds={form.selectedIds}
        onToggle={form.toggleArtifact}
      />

      <ActionBar>
        {setId && (
          <Button
            type="button"
            variant="destructive"
            disabled={form.isBusy}
            onClick={() => void form.remove()}
          >
            Видалити сет
          </Button>
        )}
        <Button type="button" variant="outline" asChild>
          <Link href={`/campaigns/${campaignId}/dm/artifact-sets`}>
            Скасувати
          </Link>
        </Button>
        <Button type="submit" disabled={form.isBusy || !fields.name.trim() || !form.abilitiesValid}>
          {form.isBusy ? "Збереження…" : withAbilityErrors(setId ? "Зберегти зміни" : "Створити сет", form.abilityErrors)}
        </Button>
      </ActionBar>
    </form>
  );
}
