"use client";

import { useEffect, useMemo, useState } from "react";

import { AbilityChips, pickAfterRemove } from "./AbilityChips";
import { AbilityPanel } from "./AbilityPanel";
import { AbilityTemplatePicker } from "./AbilityTemplatePicker";
import { AbilityEditorProvider } from "./editor-context";

import { HudSection } from "@/components/hud/form";
import { validateAbilities, withFreshIds } from "@/lib/utils/abilities/editor";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";
import type { Ability } from "@/lib/utils/abilities/schema";

interface AbilityListEditorProps {
  campaignId: string;
  value: Ability[];
  onChange: (next: Ability[]) => void;
  issues?: ConversionIssue[];
  onValidityChange?: (ok: boolean, errorCount: number) => void;
}

export function AbilityListEditor({ campaignId, value, onChange, issues = [], onValidityChange }: AbilityListEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(value[0]?.id ?? null);

  const validation = useMemo(() => validateAbilities(value), [value]);

  const errorCount = Object.keys(validation.errorsByPath).length;

  const invalidIds = useMemo(() => {
    const ids = new Set<string>();

    for (const key of Object.keys(validation.errorsByPath)) {
      const id = value[Number(key.split(".")[0])]?.id;

      if (id) ids.add(id);
    }

    return ids;
  }, [validation.errorsByPath, value]);

  const current = value.find((a) => a.id === selectedId) ?? value[0] ?? null;

  const index = current ? value.indexOf(current) : -1;

  useEffect(() => {
    onValidityChange?.(validation.ok, errorCount);
  }, [validation.ok, errorCount, onValidityChange]);

  const add = (items: Ability[]) => {
    const fresh = withFreshIds(items, value.map((a) => a.id));

    onChange([...value, ...fresh]);
    setSelectedId(fresh[0]?.id ?? selectedId);
  };

  const remove = () => {
    setSelectedId(pickAfterRemove(value.map((a) => a.id), index));
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <AbilityEditorProvider value={{ campaignId, errorsByPath: validation.errorsByPath }}>
      <HudSection
        title={
          <>
            Вміння · {value.length}
            {errorCount > 0 && <span className="ml-2 text-[#d0705c]">помилок: {errorCount}</span>}
          </>
        }
      >
        {issues.length > 0 && (
          <div className="mb-2 rounded-md border border-[#c9a04a]/50 bg-[#c9a04a]/10 p-2 text-xs text-[#efe5d2]">
            <p className="font-medium">Збережені вміння мають невалідні дані — перевірте перед збереженням:</p>
            <ul className="list-disc pl-4">
              {issues.map((i, idx) => (
                <li key={`${idx}-${i.message}`}>{i.message}</li>
              ))}
            </ul>
          </div>
        )}
        <AbilityChips abilities={value} selectedId={current?.id ?? null} invalidIds={invalidIds} onSelect={setSelectedId} onAdd={() => setPickerOpen(true)} />
        {current ? (
          <AbilityPanel
            key={current.id}
            ability={current}
            path={String(index)}
            actions={{ onChange: (next) => onChange(value.map((a, i) => (i === index ? next : a))), onRemove: remove }}
          />
        ) : (
          <p className="py-2 text-sm text-[#8f8473]">Вмінь ще немає</p>
        )}
      </HudSection>
      <AbilityTemplatePicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={add} />
    </AbilityEditorProvider>
  );
}
