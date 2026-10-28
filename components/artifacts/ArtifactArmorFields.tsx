"use client";

import { HUD_SELECT_CLASS, HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ARMOR_CATEGORIES, armorDexCap,type ArmorStats } from "@/lib/utils/artifacts/armor-stats";

const CATEGORY_LABELS: Record<ArmorStats["category"], string> = { light: "Легка", medium: "Середня", heavy: "Важка" };

const intOrUndefined = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? undefined : Math.trunc(Number(v)));

export function ArtifactArmorFields({ value, onChange }: { value: ArmorStats | null; onChange: (next: ArmorStats | null) => void }) {
  if (!value) {
    return (
      <HudSection title="Броня">
        <p className="text-sm text-muted-foreground">КЗ героя з класами рахується з бази броні й Спритності.</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange({ category: "light", base: 11 })}>
          Додати модель броні
        </Button>
      </HudSection>
    );
  }

  const set = <K extends keyof ArmorStats>(key: K, v: ArmorStats[K] | undefined) => {
    const next = { ...value, [key]: v } as ArmorStats;

    if (v === undefined || v === false) delete next[key];

    onChange(next);
  };

  return (
    <HudSection title="Броня" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="armor-category" className="text-xs text-muted-foreground">Категорія броні</Label>
          <select id="armor-category" className={`${HUD_SELECT_CLASS} w-full`} value={value.category} onChange={(e) => set("category", e.target.value as ArmorStats["category"])}>
            {ARMOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="armor-base" className="text-xs text-muted-foreground">База КЗ</Label>
          <Input id="armor-base" type="number" min={1} max={30} value={value.base} onChange={(e) => set("base", intOrUndefined(e.target.value) ?? value.base)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="armor-dex-cap" className="text-xs text-muted-foreground">Межа Спритності</Label>
          <Input id="armor-dex-cap" type="number" min={0} max={10} placeholder={String(armorDexCap({ ...value, dexCap: undefined }) ?? "—")} value={value.dexCap ?? ""} onChange={(e) => set("dexCap", intOrUndefined(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="armor-strength" className="text-xs text-muted-foreground">Вимога Сили</Label>
          <Input id="armor-strength" type="number" min={1} max={30} value={value.strength ?? ""} onChange={(e) => set("strength", intOrUndefined(e.target.value))} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" aria-label="Перешкода на Скритність" checked={!!value.stealthDisadvantage} onChange={(e) => set("stealthDisadvantage", e.target.checked)} />
        Перешкода на Скритність
      </label>
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
        Прибрати модель броні
      </Button>
    </HudSection>
  );
}
