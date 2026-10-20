"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { LEGEND_KINDS, LEGEND_LABELS, PAGE_STATUS_LABELS, PAGE_STATUSES } from "@/lib/constants/scenario";
import { useCharacters } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { useScenarioPageActions } from "@/lib/hooks/scenario";
import type { LegendEntry, LegendKind, ScenarioPage, ScenarioPageStatus } from "@/types/scenario";

const SELECT = "h-10 w-full rounded-md border bg-transparent px-3";

export function PagePropertiesDialog({ campaignId, page, legend, onLegend, onClose }: { campaignId: string; page: ScenarioPage; legend: LegendEntry[]; onLegend: (legend: LegendEntry[]) => void; onClose: () => void }) {
  const actions = useScenarioPageActions(campaignId);

  const { data: roster = [] } = useCharacters(campaignId, { compact: true });

  const [form, setForm] = useState({ title: page.title, subtitle: page.subtitle ?? "", arc: page.arc ?? "", status: page.status, characterId: page.characterId ?? "" });

  const [items, setItems] = useState<LegendEntry[]>(legend);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const router = useRouter();

  const confirm = useConfirm();

  const removePage = async () => {
    if (!(await confirm({ title: `Видалити сторінку «${page.title}»?`, description: "Сторінку і всі її версії буде видалено назавжди.", confirmLabel: "Видалити" }))) return;

    await actions
      .remove(page.id)
      .then(() => router.push(`/campaigns/${campaignId}/dm/scenario`))
      .catch(() => {});
  };

  const submit = async () => {
    await actions
      .updateMeta(page.id, {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        status: form.status,
        ...(page.kind === "scene" && { arc: form.arc.trim() || null }),
        ...(page.kind === "hero" && { characterId: form.characterId || null }),
      })
      .then(() => {
        onLegend(items.filter((i) => i.label.trim()));
        onClose();
      })
      .catch(() => {});
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
          <select id="sp-status" className={SELECT} value={form.status} onChange={(e) => set("status", e.target.value as ScenarioPageStatus)}>
            {PAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAGE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {page.kind === "hero" && (
          <div className="space-y-1.5">
            <Label htmlFor="sp-character">Персонаж</Label>
            <select id="sp-character" className={SELECT} value={form.characterId} onChange={(e) => set("characterId", e.target.value)}>
              <option value="">— без прив&apos;язки —</option>
              {roster.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Легенда</Label>
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <select aria-label="Колір позначки" className={`${SELECT} w-40`} value={item.kind} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, kind: e.target.value as LegendKind } : x)))}>
                {LEGEND_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {LEGEND_LABELS[k]}
                  </option>
                ))}
              </select>
              <Input aria-label="Підпис позначки" value={item.label} maxLength={80} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Button type="button" variant="outline" onClick={() => setItems((l) => l.filter((_, j) => j !== i))}>
                Прибрати
              </Button>
            </div>
          ))}
          {items.length < 12 && (
            <Button type="button" variant="outline" onClick={() => setItems((l) => [...l, { kind: "read", label: LEGEND_LABELS.read }])}>
              Додати позначку
            </Button>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
