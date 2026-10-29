"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { AbilityListEditor } from "@/components/abilities";
import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import { HUD_SELECT_CLASS, HudSection } from "@/components/hud/form";
import { HudChipTabs } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { useErrorTotals } from "@/lib/hooks/common";
import type { Ability } from "@/types/abilities";
import type { Choice } from "@/types/choices";
import type { ClassColumn, ClassFeature } from "@/types/classes";

interface ClassFeaturesEditorProps {
  campaignId: string;
  value: ClassFeature[];
  onChange: (next: ClassFeature[]) => void;
  onValidityChange?: (ok: boolean, errorCount: number) => void;
  classColumns?: readonly ClassColumn[];
}

export function ClassFeaturesEditor({ campaignId, value, onChange, onValidityChange, classColumns }: ClassFeaturesEditorProps) {
  const { report, drop } = useErrorTotals(onValidityChange);

  const used = new Set(value.map((f) => f.level));

  const free = Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => i + 1).filter((l) => !used.has(l));

  const [picked, setPicked] = useState<number | null>(null);

  const [active, setActive] = useState<number | null>(null);

  const [levelErrors, setLevelErrors] = useState<Record<string, number>>({});

  const next = picked !== null && free.includes(picked) ? picked : (free[0] ?? null);

  const sorted = [...value].sort((a, b) => a.level - b.level);

  const current = active !== null && used.has(active) ? active : (sorted[0]?.level ?? null);

  const reportLevel = (key: string, count: number) => {
    report(key, count);
    setLevelErrors((p) => (p[key] === count ? p : { ...p, [key]: count }));
  };

  const hasErrors = (level: number) => (levelErrors[String(level)] ?? 0) + (levelErrors[`choices-${level}`] ?? 0) > 0;

  const add = () => {
    if (next === null) return;

    onChange([...value, { level: next, abilities: [] }].sort((a, b) => a.level - b.level));
    setActive(next);
    setPicked(null);
  };

  const remove = (level: number) => {
    drop(String(level));
    drop(`choices-${level}`);
    setLevelErrors(({ [String(level)]: _a, [`choices-${level}`]: _b, ...rest }) => rest);
    onChange(value.filter((f) => f.level !== level));
  };

  const setAbilities = (level: number, abilities: Ability[]) => onChange(value.map((f) => (f.level === level ? { ...f, abilities } : f)));

  const setChoices = (level: number, choices: Choice[]) =>
    onChange(value.map((f) => (f.level !== level ? f : choices.length > 0 ? { ...f, choices } : { level: f.level, abilities: f.abilities })));

  return (
    <div className="space-y-4">
      {sorted.length > 0 && (
        <HudChipTabs
          ariaLabel="Рівні класу"
          items={sorted.map((f) => ({
            key: String(f.level),
            active: f.level === current,
            onSelect: () => setActive(f.level),
            label: (
              <span className="flex items-center gap-1.5">
                {f.level}
                {hasErrors(f.level) && <span role="img" aria-label="Є помилки" className="size-1.5 rounded-full bg-hud-bad" />}
              </span>
            ),
          }))}
        />
      )}

      {sorted.map((feature) => (
        <div key={feature.level} hidden={feature.level !== current}>
        <HudSection
          title={`Рівень ${feature.level}`}
          action={
            <Button type="button" variant="ghost" size="sm" aria-label={`Видалити рівень ${feature.level}`} onClick={() => remove(feature.level)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        >
          <AbilityListEditor
            campaignId={campaignId}
            value={feature.abilities}
            onChange={(abilities) => setAbilities(feature.level, abilities)}
            onValidityChange={(_, n) => reportLevel(String(feature.level), n)}
            classColumns={classColumns}
          />
          <div className="mt-3 space-y-2">
            <p className="hud-sc text-xs text-hud-muted">Вибори</p>
            <ChoiceListEditor campaignId={campaignId} owner="class" value={feature.choices ?? []} onChange={(choices) => setChoices(feature.level, choices)} classColumns={classColumns} onValidityChange={(_, n) => reportLevel(`choices-${feature.level}`, n)} />
          </div>
        </HudSection>
        </div>
      ))}

      {free.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Рівень для додавання" className={HUD_SELECT_CLASS} value={next ?? ""} onChange={(e) => setPicked(Number(e.target.value))}>
            {free.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="h-4 w-4" />
            Додати рівень
          </Button>
        </div>
      )}
    </div>
  );
}
