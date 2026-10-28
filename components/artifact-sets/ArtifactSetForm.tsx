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
import { type ArtifactSetFormInitial, useArtifactSetForm } from "@/lib/hooks/artifact-sets";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";

export interface ArtifactSetFormProps {
  campaignId: string;
  setId?: string;
  initial?: ArtifactSetFormInitial & { abilityIssues?: ConversionIssue[] };
}

export function ArtifactSetForm({ campaignId, setId, initial = {} }: ArtifactSetFormProps) {
  const editor = useArtifactSetForm({ campaignId, setId, initial });

  const abilityIssues = initial.abilityIssues ?? [];

  const { data, set } = editor.form;

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
              value={data.name}
              onChange={(e) => set("name", e.target.value)}
              required
              maxLength={120}
              placeholder="Наприклад, Спадщина дракона"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="set-desc">Опис (для довідки)</Label>
            <Textarea
              id="set-desc"
              value={data.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Коротко про призначення сету"
            />
          </div>

          <div className="space-y-2">
            <ImageUpload value={data.icon} onChange={(v) => set("icon", v)} label="Іконка для бою" fallbackText={data.name} />
            <p className="text-xs text-muted-foreground">
              Показується біля портрета в битві при повному сеті. Завантажений файл
              зберігається в сховищі кампанії (як іконки артефактів), у базі лишається
              посилання.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="set-bonus-name">Назва бонусу</Label>
              <Input id="set-bonus-name" value={data.bonusName} onChange={(e) => set("bonusName", e.target.value)} placeholder="Наприклад, Кров дракона" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-bonus-desc">Опис бонусу</Label>
              <Textarea id="set-bonus-desc" value={data.bonusDescription} onChange={(e) => set("bonusDescription", e.target.value)} rows={2} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: ARTIFACT_SET_FORM_TAB.members,
      label: "Артефакти",
      content: <ArtifactSetMembersPicker artifacts={editor.members.selectable} selectedIds={editor.members.selectedIds} onToggle={editor.members.toggle} />,
    },
    {
      id: ARTIFACT_SET_FORM_TAB.abilities,
      label: "Вміння",
      invalid: editor.abilities.errors > 0 || abilityIssues.length > 0,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          value={data.abilities}
          onChange={(a) => set("abilities", a)}
          issues={abilityIssues}
          onValidityChange={editor.abilities.onValidityChange}
        />
      ),
    },
  ];

  return (
    <>
      {editor.status.error && (
        <p role="alert" className="mx-4 mt-3 rounded-md border border-hud-danger/50 bg-hud-danger/10 px-3 py-2 text-sm text-[#f0b4a6]">
          {editor.status.error}
        </p>
      )}
      <HudForm
        id="artifact-set-form"
        onSubmit={editor.actions.submit}
        tabs={tabs}
        actions={
          <>
            {setId && (
              <Button type="button" variant="destructive" disabled={editor.status.isBusy} onClick={() => void editor.actions.remove()}>
                Видалити сет
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${campaignId}/dm/artifact-sets`}>Скасувати</Link>
            </Button>
            <Button type="submit" disabled={editor.status.isBusy || !data.name.trim() || !editor.abilities.valid}>
              {editor.status.isBusy ? "Збереження…" : withAbilityErrors(setId ? "Зберегти зміни" : "Створити сет", editor.abilities.errors)}
            </Button>
          </>
        }
      />
    </>
  );
}
