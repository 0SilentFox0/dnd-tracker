"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { ConditionSection } from "./sections/ConditionSection";
import { EffectsSection } from "./sections/EffectsSection";
import { LimitsSection } from "./sections/LimitsSection";
import { PerformSection } from "./sections/PerformSection";
import { sectionId } from "./sections/SectionShell";
import { TriggerSection } from "./sections/TriggerSection";
import { AbilityFlow } from "./AbilityFlow";
import { useErrorsUnder } from "./editor-context";
import { FieldErrors } from "./FieldErrors";
import type { FlowPart } from "./flow-part";
import { useAbilityText } from "./use-ability-text";

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
  state: SectionState;
}

export interface SectionState {
  open: boolean;
  onToggle: () => void;
  summary: string | null;
}

const HIGHLIGHT = ["bg-hud-gold/15", "transition-colors"];

const HIGHLIGHT_MS = 1200;

const FLOW_PARTS: readonly FlowPart[] = ["when", "if", "then", "limits"];

export function AbilityPanel({ ability, path, actions }: { ability: Ability; path: string; actions: { onChange: (a: Ability) => void; onRemove: () => void } }) {
  const t = useTranslations("abilities.panel");

  const summary = useMemo(() => summarizeAbility(ability), [ability]);

  const text = useAbilityText();

  const [open, setOpen] = useState<Record<FlowPart, boolean>>(() => ({ when: true, then: true, if: summary.if.length > 0, limits: summary.limits.length > 0 }));

  const errorParts: Record<FlowPart, boolean> = {
    when: useErrorsUnder(`${path}.trigger`).length > 0,
    if: useErrorsUnder(`${path}.condition`).length > 0,
    limits: useErrorsUnder(`${path}.limits`).length > 0,
    then: useErrorsUnder(`${path}.effects`).length > 0,
  };

  const errorKey = FLOW_PARTS.filter((p) => errorParts[p]).join();

  const [seenErrors, setSeenErrors] = useState("");

  if (errorKey !== seenErrors) {
    setSeenErrors(errorKey);

    if (errorKey) setOpen((o) => ({ ...o, ...Object.fromEntries(errorKey.split(",").map((p) => [p, true])) }));
  }

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const frame = useRef<number>(undefined);

  const lit = useRef<HTMLElement | null>(null);

  const unlight = () => {
    clearTimeout(timer.current);
    lit.current?.classList.remove(...HIGHLIGHT);
    lit.current = null;
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current ?? 0);
      unlight();
    },
    [],
  );

  const reveal = (part: FlowPart) => {
    const el = document.getElementById(sectionId(path, part));

    if (!el) return;

    unlight();
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el.focus({ preventScroll: true });
    el.classList.add(...HIGHLIGHT);
    lit.current = el;
    timer.current = setTimeout(unlight, HIGHLIGHT_MS);
  };

  const focusSection = (part: FlowPart) => {
    cancelAnimationFrame(frame.current ?? 0);

    if (open[part]) return reveal(part);

    setOpen((o) => ({ ...o, [part]: true }));
    frame.current = requestAnimationFrame(() => reveal(part));
  };

  const summaries: Record<FlowPart, string | null> = {
    when: text.segments(summary.when) || null,
    if: text.segments(summary.if) || null,
    limits: text.segments(summary.limits) || null,
    then: text.lines(summary.then).join(" · ") || null,
  };

  const stateOf = (part: FlowPart): SectionState => ({ open: open[part], onToggle: () => setOpen((o) => ({ ...o, [part]: !o[part] })), summary: summaries[part] });

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
      <AbilityFlow summary={summary} variant="editor" onChipClick={focusSection} sectionId={(part) => sectionId(path, part)} />
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
      <TriggerSection {...section} state={stateOf("when")} />
      <ConditionSection {...section} state={stateOf("if")} />
      <LimitsSection {...section} state={stateOf("limits")} />
      <PerformSection {...section} state={stateOf("then")} />
      <EffectsSection {...section} state={stateOf("then")} />
    </div>
  );
}
