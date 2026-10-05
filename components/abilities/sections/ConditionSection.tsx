"use client";

import type { AbilitySectionProps } from "../AbilityRow";
import { ConditionEditor, DEFAULT_CONDITION } from "../ConditionEditor";
import { SectionTitle } from "./SectionTitle";

import { Button } from "@/components/ui/button";

export function ConditionSection({ ability, path, onChange }: AbilitySectionProps) {
  const { condition, ...rest } = ability;

  return (
    <div className="space-y-2">
      <SectionTitle>Умова</SectionTitle>
      {condition ? (
        <ConditionEditor condition={condition} path={`${path}.condition`} actions={{ onChange: (c) => onChange({ ...ability, condition: c }), onRemove: () => onChange(rest) }} />
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...ability, condition: DEFAULT_CONDITION })}>
          + умова
        </Button>
      )}
    </div>
  );
}
