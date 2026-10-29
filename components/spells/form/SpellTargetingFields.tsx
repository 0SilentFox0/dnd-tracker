"use client";

import { type ReactNode, useState } from "react";

import { SAVE_ABILITY_KEYS, SAVE_ON_SUCCESS_KEYS, SPELL_RESOLUTION_KEYS, SPELL_SIDE_KEYS, TARGETING_KINDS, TEMPLATE_SHAPE_KEYS } from "./spell-form-defaults";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import type { AbilityKey } from "@/lib/constants/abilities";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { TemplateShape } from "@/types/battle";
import type { SpellResolution, SpellTargeting } from "@/types/spells";

const RANGED_KINDS = ["ally", "enemy", "allyDead", "area", "template"];

function RangeInput({ id, value, onCommit }: { id: string; value: number | undefined; onCommit: (value: number | undefined) => void }) {
  const t = useTranslator();

  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;

    setDraft(null);

    const n = parseInt(draft);

    onCommit(Number.isFinite(n) ? Math.max(5, Math.min(600, n)) : undefined);
  };

  return <Input id={id} type="number" min={5} max={600} step={5} placeholder={t("spellEditor.power.rangePlaceholder")} value={draft ?? value ?? ""} onChange={(e) => setDraft(e.target.value)} onBlur={commit} className="w-40" />;
}

export function targetingOf(kind: string, previous: SpellTargeting, exactDefault = false): SpellTargeting {
  const range = RANGED_KINDS.includes(kind) && "range" in previous ? { range: previous.range } : {};

  const multi = previous.kind === "area" || previous.kind === "template" ? previous : null;

  const side = multi?.side ?? "enemy";

  const maxTargets = multi?.maxTargets ?? 3;

  if (kind === "area") return { kind, side, maxTargets, ...range, ...(previous.kind === "area" && previous.chain ? { chain: true } : {}) };

  if (kind === "template") return { kind, shape: previous.kind === "template" ? previous.shape : "circle", size: previous.kind === "template" ? previous.size : 20, side, maxTargets, ...range, ...(previous.kind === "template" && previous.zone ? { zone: previous.zone } : {}), ...(previous.kind === "template" && previous.hollow ? { hollow: true } : {}), ...(previous.kind === "template" ? previous.exact !== undefined && { exact: previous.exact } : exactDefault && { exact: true }) };

  return { kind, ...range } as SpellTargeting;
}

export interface TargetingValue {
  targeting: SpellTargeting;
  resolution: SpellResolution;
}

interface SpellTargetingFieldsProps {
  value: TargetingValue;
  onChange: (value: TargetingValue) => void;
  classesEnabled?: boolean;
  idPrefix?: string;
  children?: ReactNode;
}

/** `children` render between the targeting block and the check (the template zone switch lives there). */
export function SpellTargetingFields({ value, onChange, classesEnabled = false, idPrefix = "", children }: SpellTargetingFieldsProps) {
  const t = useTranslator();

  const { targeting, resolution } = value;

  const id = (name: string) => (idPrefix ? `${idPrefix}.${name}` : name);

  const tp = (key: string, values?: Record<string, string | number>) => t(`spellEditor.power.${key}`, values);

  const options = (keys: string[], prefix: string) => keys.map((k) => ({ value: k, label: t(`${prefix}.${k}`) }));

  const resolutionOptions = options(SPELL_RESOLUTION_KEYS, "spellEditor.power.resolution");

  return (
    <>
      <div className="col-span-2">
        <Label htmlFor={id("targeting")}>{tp("targets")}</Label>
        <SelectField id={id("targeting")} value={targeting.kind} onValueChange={(kind) => onChange({ ...value, targeting: targetingOf(kind, targeting, classesEnabled) })} placeholder={tp("targets")} options={options(TARGETING_KINDS, "spells.targeting")} />
      </div>
      {targeting.kind === "template" && (
        <>
          <div>
            <Label htmlFor={id("template-shape")}>{tp("shape")}</Label>
            <SelectField id={id("template-shape")} value={targeting.shape} onValueChange={(shape) => onChange({ ...value, targeting: { ...targeting, shape: shape as TemplateShape, hollow: shape === "circle" ? targeting.hollow : undefined, exact: shape === "circle" ? targeting.exact ?? (classesEnabled || undefined) : undefined, ...(shape === "emanation" && { range: undefined }) } })} placeholder={tp("shape")} options={options(TEMPLATE_SHAPE_KEYS, "spells.shapes")} />
          </div>
          <div>
            <Label htmlFor={id("template-size")}>{tp("size")}</Label>
            <BoundedNumberInput id={id("template-size")} min={5} max={120} value={targeting.size} onCommit={(v) => onChange({ ...value, targeting: { ...targeting, size: v } })} className="w-24" />
          </div>
        </>
      )}
      {targeting.kind === "template" && targeting.shape === "circle" && (
        <div className="col-span-2 flex items-center gap-2">
          <Switch id={id("template-exact")} checked={!!targeting.exact} onCheckedChange={(on) => onChange({ ...value, targeting: { ...targeting, exact: on || undefined } })} />
          <Label htmlFor={id("template-exact")}>{tp("exact")}</Label>
        </div>
      )}
      {targeting.kind === "template" && targeting.shape === "circle" && (
        <div className="col-span-2 flex items-center gap-2">
          <Switch id={id("template-hollow")} checked={!!targeting.hollow} onCheckedChange={(on) => onChange({ ...value, targeting: { ...targeting, hollow: on || undefined } })} />
          <Label htmlFor={id("template-hollow")}>{tp("hollow")}</Label>
        </div>
      )}
      {(targeting.kind === "area" || targeting.kind === "template") && (
        <>
          <div>
            <Label htmlFor={id("targeting-side")}>{tp(targeting.kind === "template" ? "sideNoMap" : "side")}</Label>
            <SelectField id={id("targeting-side")} value={targeting.side} onValueChange={(side) => onChange({ ...value, targeting: { ...targeting, side: side as "ally" | "enemy" } })} placeholder={tp("side")} options={options(SPELL_SIDE_KEYS, "spellEditor.power.sides")} />
          </div>
          <div>
            <Label htmlFor={id("targeting-max")}>{tp(targeting.kind === "template" ? "maxTargetsNoMap" : "maxTargets")}</Label>
            <BoundedNumberInput id={id("targeting-max")} min={1} max={20} value={targeting.maxTargets} onCommit={(v) => onChange({ ...value, targeting: { ...targeting, maxTargets: v } })} className="w-24" />
          </div>
        </>
      )}
      {targeting.kind === "area" && (
        <div className="col-span-2 flex items-center gap-2">
          <Switch id={id("targeting-chain")} checked={!!targeting.chain} onCheckedChange={(on) => onChange({ ...value, targeting: { ...targeting, chain: on || undefined } })} />
          <Label htmlFor={id("targeting-chain")}>{tp("chain")}</Label>
        </div>
      )}
      {RANGED_KINDS.includes(targeting.kind) && !(targeting.kind === "template" && targeting.shape === "emanation") && (
        <div className="col-span-2">
          <Label htmlFor="spell-range">{tp("range")}</Label>
          <RangeInput id={id("spell-range")} value={(targeting as { range?: number }).range} onCommit={(range) => onChange({ ...value, targeting: { ...targeting, range } as SpellTargeting })} />
        </div>
      )}
      {children}
      <div className="col-span-2">
        <Label htmlFor={id("resolution")}>{tp("check")}</Label>
        <SelectField id={id("resolution")} value={resolution.kind} onValueChange={(kind) => onChange({ ...value, resolution: kind === "save" ? { kind, ability: "dexterity", onSuccess: "half" } : kind === "attack" ? { kind } : { kind: "auto" } })} placeholder={tp("check")} options={classesEnabled || resolution.kind === "attack" ? resolutionOptions : resolutionOptions.filter((o) => o.value !== "attack")} />
      </div>
      {resolution.kind === "save" && (
        <>
          <div>
            <Label htmlFor={id("save-ability")}>{tp("saveAbility")}</Label>
            <SelectField id={id("save-ability")} value={resolution.ability} onValueChange={(ability) => onChange({ ...value, resolution: { ...resolution, ability: ability as AbilityKey } })} placeholder={tp("saveAbility")} options={SAVE_ABILITY_KEYS.map((k) => ({ value: k, label: t(`gameTerms.abilities.${k}.label`) }))} />
          </div>
          <div>
            <Label htmlFor={id("save-on-success")}>{tp("onSuccess")}</Label>
            <SelectField id={id("save-on-success")} value={resolution.onSuccess} onValueChange={(onSuccess) => onChange({ ...value, resolution: { ...resolution, onSuccess: onSuccess as "half" | "none" } })} placeholder={tp("onSuccess")} options={options(SAVE_ON_SUCCESS_KEYS, "spells.saveOnSuccess")} />
          </div>
        </>
      )}
    </>
  );
}
