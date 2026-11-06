"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { WfrpDraftFormState } from "./types";

import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { ALIGNMENTS } from "@/lib/constants/alignment";

export function IdentityStep({ form }: { form: WfrpDraftFormState }) {
  const t = useTranslations("wfrpCreation.identity");

  const te = useTranslations("wfrpCreation.errors");

  const [goal, setGoal] = useState("");

  const { values, set } = form.identity;

  const goals = values.goals ?? [];

  const addGoal = () => {
    const text = goal.trim();

    if (!text) return;

    set({ goals: [...goals, { text, kind: "personal" }] });
    setGoal("");
  };

  const { preview } = form;

  return (
    <div className="space-y-4">
      <p className="text-sm text-hud-muted">{form.step.total === 1 ? t("reopenNote") : t("hint")}</p>
      {preview?.ok && <p className="text-sm font-semibold">{t("experience", { xp: preview.experience })}</p>}
      {preview && !preview.ok && (
        <ul role="alert" className="list-disc pl-5 text-sm text-destructive">
          {preview.errors.map((code) => (
            <li key={code}>{te(code as never)}</li>
          ))}
        </ul>
      )}
      <FormField label={t("name")} htmlFor="wfrp-draft-name" required>
        <Input id="wfrp-draft-name" className="min-h-11" maxLength={100} value={values.name} placeholder={t("namePlaceholder")} onChange={(e) => set({ name: e.target.value })} />
      </FormField>
      <FormField label={t("alignment")} htmlFor="wfrp-draft-alignment">
        <SelectField id="wfrp-draft-alignment" value={values.alignment ?? ""} onValueChange={(v) => set({ alignment: v })} placeholder={t("alignmentPlaceholder")} options={ALIGNMENTS.map((a) => ({ value: a, label: a }))} allowNone triggerClassName="min-h-11 w-full" />
      </FormField>
      <FormField label={t("background")} htmlFor="wfrp-draft-background">
        <Textarea id="wfrp-draft-background" rows={6} maxLength={4000} value={values.background ?? ""} placeholder={t("backgroundPlaceholder")} onChange={(e) => set({ background: e.target.value })} />
      </FormField>
      <ImageUpload label={t("avatar")} value={values.avatar ?? ""} onChange={(v) => set({ avatar: v })} fallbackText={values.name} maxSide={1200} />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("goals")}</h3>
        {goals.length > 0 && (
          <ul className="grid gap-2">
            {goals.map((g, i) => (
              <li key={`${i}-${g.text}`} className="flex min-h-11 items-center gap-2 rounded-lg border border-hud-line px-3 py-1 text-sm">
                <span className="min-w-0 flex-1">{g.text}</span>
                <Button type="button" size="icon" variant="ghost" className="size-11" aria-label={t("removeGoal")} onClick={() => set({ goals: goals.filter((_, j) => j !== i) })}>
                  ×
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input aria-label={t("goalPlaceholder")} className="min-h-11" maxLength={500} value={goal} placeholder={t("goalPlaceholder")} onChange={(e) => setGoal(e.target.value)} />
          <Button type="button" variant="outline" className="min-h-11" onClick={addGoal} disabled={!goal.trim()}>
            {t("addGoal")}
          </Button>
        </div>
      </section>
    </div>
  );
}
