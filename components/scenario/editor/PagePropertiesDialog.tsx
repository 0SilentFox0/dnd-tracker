"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CharacterSelect } from "@/components/scenario/CharacterSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { LEGEND_KINDS, LEGEND_LABELS, PAGE_STATUS_LABELS, PAGE_STATUSES, SCENARIO_MAX_LEGEND } from "@/lib/constants/scenario";
import { useConfirm } from "@/lib/hooks/common";
import { useScenarioPageActions } from "@/lib/hooks/scenario";
import type { LegendEntry, LegendKind, ScenarioPage, ScenarioPageStatus } from "@/types/scenario";

const STATUS_OPTIONS = PAGE_STATUSES.map((s) => ({ value: s, label: PAGE_STATUS_LABELS[s] }));

const LEGEND_OPTIONS = LEGEND_KINDS.map((k) => ({ value: k, label: LEGEND_LABELS[k] }));

export function PagePropertiesDialog({ campaignId, page, legend, onLegend, onClose }: { campaignId: string; page: ScenarioPage; legend: LegendEntry[]; onLegend: (legend: LegendEntry[]) => void; onClose: () => void }) {
  const actions = useScenarioPageActions(campaignId);

  const [form, setForm] = useState({ title: page.title, subtitle: page.subtitle ?? "", arc: page.arc ?? "", status: page.status, characterId: page.characterId ?? "" });

  const [items, setItems] = useState<LegendEntry[]>(legend);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const patchItem = (i: number, patch: Partial<LegendEntry>) => setItems((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const router = useRouter();

  const confirm = useConfirm();

  const removePage = async () => {
    if (!(await confirm({ title: `Видалити сторінку «${page.title}»?`, description: "Сторінку і всі її версії буде видалено назавжди.", confirmLabel: "Видалити" }))) return;

    try {
      await actions.remove(page.id);
      router.push(`/campaigns/${campaignId}/dm/scenario`);
    } catch {
      // the mutation already shows the error toast
    }
  };

  const submit = async () => {
    try {
      await actions.updateMeta(page.id, {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        status: form.status,
        ...(page.kind === "scene" && { arc: form.arc.trim() || null }),
        ...(page.kind === "hero" && { characterId: form.characterId || null }),
      });
      onLegend(items.filter((i) => i.label.trim()));
      onClose();
    } catch {
      // the mutation already shows the error toast
    }
  };

  return (
    <ResponsiveDialog
      hud
      open
      onOpenChange={(o) => !o && onClose()}
      title="Властивості сторінки"
      footer={
        <>
          <Button type="button" variant="destructive" disabled={actions.isPending} onClick={() => void removePage()}>
            Видалити сторінку
          </Button>
          <Button type="submit" form="scenario-props-form" disabled={actions.isPending || !form.title.trim()}>
            Зберегти
          </Button>
        </>
      }
    >
      <form
        id="scenario-props-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="sp-title">Назва</Label>
          <Input id="sp-title" value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-subtitle">Підзаголовок</Label>
          <Input id="sp-subtitle" value={form.subtitle} maxLength={500} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
        {page.kind === "scene" && (
          <div className="space-y-1.5">
            <Label htmlFor="sp-arc">Арка</Label>
            <Input id="sp-arc" value={form.arc} maxLength={120} onChange={(e) => set("arc", e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="sp-status">Статус</Label>
          <SelectField id="sp-status" value={form.status} onValueChange={(v) => set("status", v as ScenarioPageStatus)} options={STATUS_OPTIONS} />
        </div>
        {page.kind === "hero" && (
          <div className="space-y-1.5">
            <Label htmlFor="sp-character">Персонаж</Label>
            <CharacterSelect campaignId={campaignId} id="sp-character" value={form.characterId} onValueChange={(v) => set("characterId", v)} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Легенда</Label>
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <SelectField
                aria-label="Колір позначки"
                value={item.kind}
                onValueChange={(v) => patchItem(i, { kind: v as LegendKind })}
                options={LEGEND_OPTIONS}
                className="w-40 shrink-0"
              />
              <Input aria-label="Підпис позначки" value={item.label} maxLength={80} onChange={(e) => patchItem(i, { label: e.target.value })} />
              <Button type="button" variant="outline" onClick={() => setItems((l) => l.filter((_, j) => j !== i))}>
                Прибрати
              </Button>
            </div>
          ))}
          {items.length < SCENARIO_MAX_LEGEND && (
            <Button type="button" variant="outline" onClick={() => setItems((l) => [...l, { kind: "read", label: LEGEND_LABELS.read }])}>
              Додати позначку
            </Button>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
