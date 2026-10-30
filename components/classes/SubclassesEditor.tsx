"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { ClassFeaturesEditor } from "./ClassFeaturesEditor";

import { EntityIcon } from "@/components/common/EntityIcon";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_SUBCLASS_LEVEL, MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { useErrorTotals } from "@/lib/hooks/common";
import { shortId } from "@/lib/utils/common/short-id";
import type { ClassFormData, Subclass } from "@/types/classes";

interface SubclassesEditorProps {
  campaignId: string;
  form: { data: ClassFormData; set: React.Dispatch<React.SetStateAction<ClassFormData>> };
  onValidityChange?: (ok: boolean, errorCount: number) => void;
}

export function SubclassesEditor({ campaignId, form: { data, set }, onValidityChange }: SubclassesEditorProps) {
  const t = useTranslations("classes");

  const { report, drop } = useErrorTotals(onValidityChange);

  const patchSubclass = (id: string, patch: Partial<Subclass>) =>
    set((prev) => ({ ...prev, subclasses: prev.subclasses.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const add = () =>
    set((prev) => ({
      ...prev,
      subclassLevel: prev.subclassLevel ?? DEFAULT_SUBCLASS_LEVEL,
      subclasses: [...prev.subclasses, { id: shortId(), name: "", features: [] }],
    }));

  const remove = (id: string) => {
    drop(id);
    set((prev) => ({ ...prev, subclasses: prev.subclasses.filter((s) => s.id !== id) }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subclass-level">{t("subclasses.levelLabel")}</Label>
        <Input
          id="subclass-level"
          type="number"
          min={1}
          max={MAX_CLASS_LEVEL}
          value={data.subclassLevel ?? ""}
          onChange={(e) => set((prev) => ({ ...prev, subclassLevel: e.target.value === "" ? null : Number(e.target.value) }))}
          className="w-24"
        />
        <p className="text-xs text-hud-muted">{t("subclasses.srdNote")}</p>
      </div>

      {data.subclasses.map((subclass) => (
        <HudSection
          key={subclass.id}
          title={
            <span className="flex items-center gap-2">
              <EntityIcon src={subclass.icon} name={subclass.name} size={24} className="size-6 rounded text-xs" />
              {subclass.name || t("subclasses.newSubclass")}
            </span>
          }
          action={
            <Button type="button" variant="ghost" size="sm" aria-label={t("subclasses.remove", { name: subclass.name })} onClick={() => remove(subclass.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        >
          <div className="space-y-3">
            <ImageUpload value={subclass.icon ?? ""} onChange={(icon) => patchSubclass(subclass.id, { icon: icon || null })} label={t("basics.icon")} fallbackText={subclass.name} allowFile={false} />
            <Input aria-label={t("subclasses.nameLabel")} value={subclass.name} required onChange={(e) => patchSubclass(subclass.id, { name: e.target.value })} placeholder={t("subclasses.nameLabel")} />
            <ClassFeaturesEditor
              campaignId={campaignId}
              value={subclass.features}
              onChange={(features) => patchSubclass(subclass.id, { features })}
              onValidityChange={(_, n) => report(subclass.id, n)}
              classColumns={data.columns ?? []}
            />
          </div>
        </HudSection>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" />
        {t("subclasses.add")}
      </Button>
    </div>
  );
}
