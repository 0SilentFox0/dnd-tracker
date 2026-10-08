"use client";

import type { AbilitySectionProps } from "../AbilityPanel";
import { FieldRenderer } from "../fields/FieldRenderer";
import { SectionTitle } from "./SectionTitle";

import type { FieldMeta } from "@/lib/utils/abilities/registry/fields";
import type { Limits } from "@/lib/utils/abilities/schema";

const LIMIT_FIELDS: readonly FieldMeta[] = [
  { name: "perBattle", label: "Разів за бій", input: "number", optional: true },
  { name: "perRound", label: "Разів за раунд", input: "number", optional: true },
  { name: "perTurn", label: "Разів за хід", input: "number", optional: true },
  { name: "chance", label: "Шанс, %", input: "number", optional: true },
];

export function LimitsSection({ ability, path, onChange }: AbilitySectionProps) {
  if (ability.trigger.event === "passive") {
    return (
      <div className="space-y-1">
        <SectionTitle>Ліміти</SectionTitle>
        <p className="text-xs text-muted-foreground">Пасивка діє постійно — ліміти не застосовуються.</p>
      </div>
    );
  }

  const isButton = ability.trigger.event === "bonusAction" || ability.trigger.event === "action";

  const setTop = (name: "stackable" | "maxStacks" | "maxTargets", v: unknown) => {
    const next = { ...ability, [name]: v } as typeof ability;

    if (v === undefined || v === false) delete next[name];

    if (name === "stackable" && v !== true) delete next.maxStacks;

    onChange(next);
  };

  const set = (name: keyof Limits, v: unknown) => {
    const next: Limits = { ...ability.limits, [name]: v };

    if (v === undefined) delete next[name];

    const { limits: _l, ...rest } = ability;

    onChange(Object.keys(next).length ? { ...rest, limits: next } : rest);
  };

  return (
    <div className="space-y-2">
      <SectionTitle>Ліміти</SectionTitle>
      <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
        {LIMIT_FIELDS.map((f) => (
          <FieldRenderer key={f.name} meta={f} path={`${path}.limits.${f.name}`} value={ability.limits?.[f.name as keyof Limits]} onChange={(v) => set(f.name as keyof Limits, v)} />
        ))}
      </div>
      <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
        <FieldRenderer meta={{ name: "stackable", label: "Ефекти складаються", input: "toggle", optional: true }} path={`${path}.stackable`} value={ability.stackable} onChange={(v) => setTop("stackable", v)} />
        {ability.stackable && (
          <FieldRenderer meta={{ name: "maxStacks", label: "Макс. стаків", input: "number", optional: true }} path={`${path}.maxStacks`} value={ability.maxStacks} onChange={(v) => setTop("maxStacks", v)} />
        )}
        {isButton && (
          <FieldRenderer meta={{ name: "maxTargets", label: "Макс. цілей", input: "number", optional: true }} path={`${path}.maxTargets`} value={ability.maxTargets} onChange={(v) => setTop("maxTargets", v)} />
        )}
      </div>
    </div>
  );
}
