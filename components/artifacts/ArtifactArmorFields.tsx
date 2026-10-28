"use client";

import { useTranslations } from "next-intl";

import { HUD_SELECT_CLASS, HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ARMOR_CATEGORIES, armorDexCap,type ArmorStats } from "@/lib/utils/artifacts/armor-stats";
import { patchDefined } from "@/lib/utils/common/patch-defined";

const intOrUndefined = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? undefined : Math.trunc(Number(v)));

export function ArtifactArmorFields({ value, onChange }: { value: ArmorStats | null; onChange: (next: ArmorStats | null) => void }) {
  const t = useTranslations("artifacts.armor");

  if (!value) {
    return (
      <HudSection title={t("title")}>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange({ category: "light", base: 11 })}>
          {t("add")}
        </Button>
      </HudSection>
    );
  }

  const set = <K extends keyof ArmorStats>(key: K, v: ArmorStats[K] | undefined) => {
    onChange(patchDefined(value, { [key]: v } as Partial<ArmorStats>, (x) => x === undefined || x === false));
  };

  return (
    <HudSection title={t("title")} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="armor-category" className="text-xs text-muted-foreground">{t("category")}</Label>
          <select id="armor-category" className={`${HUD_SELECT_CLASS} w-full`} value={value.category} onChange={(e) => set("category", e.target.value as ArmorStats["category"])}>
            {ARMOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`categories.${c}`)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="armor-base" className="text-xs text-muted-foreground">{t("base")}</Label>
          <Input id="armor-base" type="number" min={1} max={30} value={value.base} onChange={(e) => set("base", intOrUndefined(e.target.value) ?? value.base)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="armor-dex-cap" className="text-xs text-muted-foreground">{t("dexCap")}</Label>
          <Input id="armor-dex-cap" type="number" min={0} max={10} placeholder={String(armorDexCap({ ...value, dexCap: undefined }) ?? "—")} value={value.dexCap ?? ""} onChange={(e) => set("dexCap", intOrUndefined(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="armor-strength" className="text-xs text-muted-foreground">{t("strength")}</Label>
          <Input id="armor-strength" type="number" min={1} max={30} value={value.strength ?? ""} onChange={(e) => set("strength", intOrUndefined(e.target.value))} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" aria-label={t("stealth")} checked={!!value.stealthDisadvantage} onChange={(e) => set("stealthDisadvantage", e.target.checked)} />
        {t("stealth")}
      </label>
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
        {t("remove")}
      </Button>
    </HudSection>
  );
}
