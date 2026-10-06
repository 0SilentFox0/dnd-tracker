"use client";

import { useEffect, useMemo, useState } from "react";

import { AbilityRow } from "./AbilityRow";
import { AbilityTemplatePicker } from "./AbilityTemplatePicker";
import { AbilityEditorProvider } from "./editor-context";

import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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

  const [open, setOpen] = useState<string[]>([]);

  const validation = useMemo(() => validateAbilities(value), [value]);

  const errorCount = Object.keys(validation.errorsByPath).length;

  useEffect(() => {
    onValidityChange?.(validation.ok, errorCount);
  }, [validation.ok, errorCount, onValidityChange]);

  const add = (items: Ability[]) => {
    const fresh = withFreshIds(items, value.map((a) => a.id));

    onChange([...value, ...fresh]);
    setOpen((o) => [...o, ...fresh.map((a) => a.id)]);
  };

  return (
    <AbilityEditorProvider value={{ campaignId, errorsByPath: validation.errorsByPath }}>
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Вміння ({value.length}){errorCount > 0 && <span className="ml-2 text-destructive">помилок: {errorCount}</span>}
          </h3>
          <Button type="button" size="sm" onClick={() => setPickerOpen(true)}>
            + Вміння
          </Button>
        </div>
        {issues.length > 0 && (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs">
            <p className="font-medium">Перенесено зі старого формату — перевірте перед збереженням:</p>
            <ul className="list-disc pl-4">
              {issues.map((i, idx) => (
                <li key={`${idx}-${i.message}`}>{i.message}</li>
              ))}
            </ul>
          </div>
        )}
        <Accordion type="multiple" value={open} onValueChange={setOpen}>
          {value.map((ability, index) => (
            <AbilityRow
              key={ability.id}
              ability={ability}
              path={String(index)}
              actions={{
                onChange: (next) => onChange(value.map((a, i) => (i === index ? next : a))),
                onRemove: () => onChange(value.filter((_, i) => i !== index)),
              }}
            />
          ))}
        </Accordion>
      </section>
      <AbilityTemplatePicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={add} />
    </AbilityEditorProvider>
  );
}
