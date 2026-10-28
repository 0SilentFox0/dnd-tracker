"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import { HUD_SELECT_CLASS,HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DND_SKILL_META,DND_SKILLS } from "@/lib/constants/skills";
import { useUpdateBackground } from "@/lib/hooks/backgrounds";
import { useFeats } from "@/lib/hooks/feats";
import { toggleItem } from "@/lib/utils/common/collections";
import type { BackgroundData, BackgroundFormData } from "@/types/backgrounds";

export function BackgroundForm({ campaignId, background }: { campaignId: string; background: BackgroundData }) {
  const { id, ...initial } = background;

  const [data, set] = useState<BackgroundFormData>(initial);

  const [invalid, setInvalid] = useState(false);

  const router = useRouter();

  const update = useUpdateBackground(campaignId);

  const { data: feats = [] } = useFeats(campaignId);

  const href = `/campaigns/${campaignId}/dm/backgrounds`;

  const patch = (next: Partial<BackgroundFormData>) => set((prev) => ({ ...prev, ...next }));

  return (
    <HudFormPage title="Редагувати передісторію" aside="Характеристики, навички, інструменти й риса походження">
      <HudForm id="background-form" onSubmit={(e) => {
        e.preventDefault();

        if (!invalid) update.mutate({ backgroundId: id, data: { ...data, name: data.name.trim() } }, { onSuccess: () => { router.push(href); router.refresh(); } });
      }} tabs={[
        { id: "basics", label: "Основне", content: <div className="space-y-4">
          <Label htmlFor="background-name">Назва передісторії *</Label>
          <Input id="background-name" required value={data.name} onChange={(e) => patch({ name: e.target.value })} />
          <ImageUpload value={data.icon ?? ""} onChange={(icon) => patch({ icon: icon || null })} label="Іконка передісторії" fallbackText={data.name} allowFile={false} />
          <Label htmlFor="background-description">Опис</Label>
          <Textarea id="background-description" value={data.description ?? ""} onChange={(e) => patch({ description: e.target.value || null })} />
          <fieldset className="space-y-2"><legend>Володіння навичками</legend><div className="flex flex-wrap gap-3">
            {DND_SKILLS.map((skill) => <label key={skill} className="flex items-center gap-2 text-sm"><Checkbox checked={data.skillProficiencies.includes(skill)} onCheckedChange={() => patch({ skillProficiencies: toggleItem(data.skillProficiencies, skill) })} />{DND_SKILL_META[skill].label}</label>)}
          </div></fieldset>
          <Label htmlFor="background-tools">Володіння інструментами (по одному в рядку)</Label>
          <Textarea id="background-tools" value={data.toolProficiencies.join("\n")} onChange={(e) => patch({ toolProficiencies: e.target.value.split("\n") })} onBlur={() => patch({ toolProficiencies: data.toolProficiencies.map((s) => s.trim()).filter(Boolean) })} />
          <Label htmlFor="background-origin">Риса походження</Label>
          <select id="background-origin" className={HUD_SELECT_CLASS} value={data.originFeatId ?? ""} onChange={(e) => patch({ originFeatId: e.target.value || null })}>
            <option value="">Без риси</option>{feats.filter((f) => f.type === "origin").map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <Label htmlFor="background-equipment">Стартове спорядження та гроші</Label>
          <Textarea id="background-equipment" value={data.equipmentText ?? ""} onChange={(e) => patch({ equipmentText: e.target.value || null })} />
          <p className="text-sm text-muted-foreground">Спорядження й гроші видає ДМ вручну. Цей опис не змінює інвентар персонажа.</p>
        </div> },
        { id: "choices", label: "Вибори", invalid, content: <ChoiceListEditor campaignId={campaignId} owner="background" value={data.choices} onChange={(choices) => patch({ choices })} onValidityChange={(valid) => setInvalid(!valid)} /> },
      ]} actions={<><Button type="button" variant="outline" onClick={() => router.push(href)}>Скасувати</Button><Button type="submit" disabled={invalid || update.isPending}>{update.isPending ? "Збереження..." : "Зберегти"}</Button></>} />
    </HudFormPage>
  );
}
