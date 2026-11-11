"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { Ailment, AilmentKind } from "@/lib/utils/rules/systems";
import { AILMENTS_MAX } from "@/lib/utils/rules/systems";

export type AilmentDraft = Omit<Ailment, "id"> & { id?: string };

const KINDS: AilmentKind[] = ["festering", "disease", "injury"];

interface Props {
  value: AilmentDraft[];
  editable: boolean;
  onChange: (value: AilmentDraft[]) => void;
}

export function AilmentsEditor({ value, editable, onChange }: Props) {
  const t = useTranslations("wfrpDowntime");

  const patch = (i: number, p: Partial<AilmentDraft>) => onChange(value.map((a, j) => (j === i ? { ...a, ...p } : a)));

  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-sm text-hud-muted">{t("tab.noAilments")}</p>}
      {value.map((a, i) =>
        editable ? (
          <div key={a.id ?? `new-${i}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr_6rem_auto] sm:items-end">
            <SelectField aria-label={t(`ailments.${a.kind}`)} value={a.kind} onValueChange={(v) => patch(i, { kind: v as AilmentKind })} options={KINDS.map((k) => ({ value: k, label: t(`ailments.${k}`) }))} triggerClassName="min-h-11 w-full" />
            <Input className="min-h-11" aria-label={t("ailmentForm.label")} placeholder={t("ailmentForm.label")} maxLength={80} value={a.label} onChange={(e) => patch(i, { label: e.target.value })} />
            <Input className="min-h-11" type="number" min={1} max={365} aria-label={t("ailmentForm.days")} value={a.daysLeft} onChange={(e) => patch(i, { daysLeft: Number(e.target.value) })} />
            <Button type="button" size="sm" variant="outline" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              {t("ailmentForm.remove")}
            </Button>
          </div>
        ) : (
          <p key={a.id ?? i} className="text-sm text-hud-bone">
            {t(`ailments.${a.kind}`)}: {a.label} · {t("ailmentForm.days")} {a.daysLeft}
          </p>
        ),
      )}
      {editable && (
        <Button type="button" size="sm" variant="outline" disabled={value.length >= AILMENTS_MAX} onClick={() => onChange([...value, { kind: "disease", daysLeft: 7, label: "" }])}>
          {t("ailmentForm.add")}
        </Button>
      )}
    </div>
  );
}
