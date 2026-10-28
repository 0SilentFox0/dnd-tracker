"use client";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useAbilityEditor } from "../editor-context";
import { FieldRenderer } from "../fields/FieldRenderer";
import { FlatField } from "../fields/FlatField";
import { ScaleColumnSelect } from "../fields/ScaleColumnSelect";
import { SectionTitle } from "./SectionTitle";

import type { FieldMeta } from "@/lib/utils/abilities/registry/fields";
import type { Limits } from "@/lib/utils/abilities/schema";

const LIMIT_FIELDS: readonly FieldMeta[] = [
  { name: "perBattle", label: "Разів за бій", input: "number", optional: true },
  { name: "perRound", label: "Разів за раунд", input: "number", optional: true },
  { name: "perTurn", label: "Разів за хід", input: "number", optional: true },
  { name: "cooldownRounds", label: "Перезарядка (раунди)", input: "number", optional: true },
  { name: "chance", label: "Шанс, %", input: "number", optional: true },
];

const REST_OPTIONS = [
  { value: "short", label: "Короткий" },
  { value: "long", label: "Довгий" },
];

export function LimitsSection({ ability, path, onChange }: AbilitySectionProps) {
  const columns = useAbilityEditor().classColumns;

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

  const setRest = (patch: { rest?: string; uses?: NonNullable<Limits["perRest"]>["uses"] }) => {
    const current = ability.limits?.perRest;

    const rest = "rest" in patch ? patch.rest : (current?.rest ?? "long");

    const uses = "uses" in patch ? patch.uses : (current?.uses ?? 1);

    const clearing = "rest" in patch ? !patch.rest : "uses" in patch && patch.uses === undefined;

    set("perRest", clearing ? undefined : { rest, uses });
  };

  return (
    <div className="space-y-2">
      <SectionTitle>Ліміти</SectionTitle>
      <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
        {LIMIT_FIELDS.map((f) => (
          <FieldRenderer key={f.name} meta={f} path={`${path}.limits.${f.name}`} value={ability.limits?.[f.name as keyof Limits]} onChange={(v) => set(f.name as keyof Limits, v)} />
        ))}
        <FieldRenderer meta={{ name: "perRestKind", label: "Відпочинок", input: "select", options: REST_OPTIONS, optional: true }} path={`${path}.limits.perRest.rest`} value={ability.limits?.perRest?.rest} onChange={(v) => setRest({ rest: v as string | undefined })} />
        {columns ? (
          <div className="col-span-3 space-y-1">
            <span className="text-xs text-muted-foreground">Разів за відпочинок</span>
            <FlatField id={`${path}.limits.perRest.uses`} meta={{ name: "perRestUses", label: "Разів", input: "flat", optional: true }} value={ability.limits?.perRest?.uses as never} onChange={(v) => setRest({ uses: v as never })} />
          </div>
        ) : (
          <FieldRenderer meta={{ name: "perRestUses", label: "Разів", input: "number", optional: true }} path={`${path}.limits.perRest.uses`} value={ability.limits?.perRest?.uses as number | undefined} onChange={(v) => setRest({ uses: v as number | undefined })} />
        )}
        {columns && isButton && (
          <div className="col-span-3 space-y-1">
            <span className="text-xs text-muted-foreground">Пул (колонка, ціна)</span>
            <div className="flex gap-1">
              <ScaleColumnSelect id={`${path}.limits.pool.key`} poolsOnly value={ability.limits?.pool?.key} onChange={(key) => set("pool", { key, cost: ability.limits?.pool?.cost ?? 1 })} />
              <input aria-label="Ціна пулу" type="number" min={1} max={20} className="h-9 w-16 rounded-md border border-hud-line bg-hud-field px-2 text-sm" value={ability.limits?.pool?.cost ?? ""} onChange={(e) => set("pool", e.target.value === "" ? undefined : { key: ability.limits?.pool?.key ?? "", cost: Number(e.target.value) })} />
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
        <FieldRenderer meta={{ name: "stackable", label: "Ефекти складаються", input: "toggle", optional: true }} path={`${path}.stackable`} value={ability.stackable} onChange={(v) => setTop("stackable", v)} />
        {ability.stackable && (
          <FieldRenderer meta={{ name: "maxStacks", label: "Макс. стаків", input: "number", optional: true }} path={`${path}.maxStacks`} value={ability.maxStacks} onChange={(v) => setTop("maxStacks", v)} />
        )}
        {isButton && (
          <FieldRenderer meta={{ name: "maxTargets", label: "Макс. цілей", input: "number", optional: true }} path={`${path}.maxTargets`} value={ability.maxTargets} onChange={(v) => setTop("maxTargets", v)} />
        )}
        {ability.trigger.event === "action" && (
          <FieldRenderer meta={{ name: "legendaryCost", label: "Легендарна дія (вартість 1–3)", input: "number", optional: true }} path={`${path}.limits.legendaryCost`} value={ability.limits?.legendaryCost} onChange={(v) => set("legendaryCost", v)} />
        )}
      </div>
    </div>
  );
}
