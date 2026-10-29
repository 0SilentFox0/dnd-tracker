"use client";

import { useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { ConditionSection } from "./sections/ConditionSection";
import { EffectsSection } from "./sections/EffectsSection";
import { LimitsSection } from "./sections/LimitsSection";
import { PerformSection } from "./sections/PerformSection";
import { sectionId } from "./sections/SectionShell";
import { TriggerSection } from "./sections/TriggerSection";
import { AbilityFlow, type FlowPart } from "./AbilityFlow";
import { useErrorsUnder } from "./editor-context";
import { FieldErrors } from "./FieldErrors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Ability } from "@/lib/utils/abilities/schema";
import { summarizeAbility } from "@/lib/utils/abilities/summary";

export interface AbilitySectionProps {
  ability: Ability;
  path: string;
  onChange: (next: Ability) => void;
}

const HIGHLIGHT = ["bg-hud-gold/15", "transition-colors"];

const HIGHLIGHT_MS = 1200;

export function AbilityPanel({ ability, path, actions }: { ability: Ability; path: string; actions: { onChange: (a: Ability) => void; onRemove: () => void } }) {
  const t = useTranslations("abilities.panel");

  const summary = useMemo(() => summarizeAbility(ability), [ability]);

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const focusSection = (part: FlowPart) => {
    const el = document.getElementById(sectionId(path, part));

    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el.classList.add(...HIGHLIGHT);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => el.classList.remove(...HIGHLIGHT), HIGHLIGHT_MS);
  };

  const section = { ability, path, onChange: actions.onChange };

  const nameErrors = useErrorsUnder(`${path}.name`);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor={`${path}.name`} className="text-xs text-muted-foreground">
            {t("name")}
          </Label>
          <Input id={`${path}.name`} value={ability.name} onChange={(e) => actions.onChange({ ...ability, name: e.target.value })} />
          <FieldErrors errors={nameErrors} testId={`field-errors-${path}.name`} />
        </div>
        <Button type="button" size="icon" variant="ghost" className="mt-5 text-hud-danger" aria-label={t("delete", { name: ability.name })} onClick={actions.onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <AbilityFlow summary={summary} variant="editor" onChipClick={focusSection} />
      <div className="space-y-1">
        <Label htmlFor={`${path}.description`} className="text-xs text-muted-foreground">
          {t("description")}
        </Label>
        <Textarea
          id={`${path}.description`}
          rows={2}
          value={ability.description ?? ""}
          onChange={(e) => {
            const { description: _d, ...rest } = ability;

            actions.onChange(e.target.value ? { ...rest, description: e.target.value } : rest);
          }}
        />
      </div>
      <TriggerSection {...section} />
      <ConditionSection {...section} />
      <LimitsSection {...section} />
      <PerformSection {...section} />
      <EffectsSection {...section} />
    </div>
  );
}
