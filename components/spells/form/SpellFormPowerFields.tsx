"use client";

import { useState } from "react";

import { DIE_SIDES, SAVE_ABILITY_KEYS, SAVE_ON_SUCCESS_KEYS, SPELL_RESOLUTION_KEYS, SPELL_SIDE_KEYS, TARGETING_KINDS, TEMPLATE_SHAPE_KEYS } from "./spell-form-defaults";
import type { SpellFormFieldsProps } from "./SpellFormBasicFields";

import { HudSection } from "@/components/hud/form";
import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Checkbox } from "@/components/ui/checkbox";
import { CommaListInput } from "@/components/ui/comma-list-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import type { AbilityKey } from "@/lib/constants/abilities";
import { useTranslator } from "@/lib/i18n/use-translator";
import { clamp } from "@/lib/utils/common/clamp";
import type { TemplateShape } from "@/types/battle";
import type { SpellTargeting } from "@/types/spells";

const RANGED_KINDS = ["ally", "enemy", "allyDead", "area", "template"];


function RangeInput({ value, onCommit }: { value: number | undefined; onCommit: (value: number | undefined) => void }) {
  const t = useTranslator();

  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;

    setDraft(null);

    const n = parseInt(draft);

    onCommit(Number.isFinite(n) ? Math.max(5, Math.min(600, n)) : undefined);
  };

  return <Input id="spell-range" type="number" min={5} max={600} step={5} placeholder={t("spellEditor.power.rangePlaceholder")} value={draft ?? value ?? ""} onChange={(e) => setDraft(e.target.value)} onBlur={commit} className="w-40" />;
}

function targetingOf(kind: string, previous: SpellTargeting, exactDefault = false): SpellTargeting {
  const range = RANGED_KINDS.includes(kind) && "range" in previous ? { range: previous.range } : {};

  const multi = previous.kind === "area" || previous.kind === "template" ? previous : null;

  const side = multi?.side ?? "enemy";

  const maxTargets = multi?.maxTargets ?? 3;

  if (kind === "area") return { kind, side, maxTargets, ...range, ...(previous.kind === "area" && previous.chain ? { chain: true } : {}) };

  if (kind === "template") return { kind, shape: previous.kind === "template" ? previous.shape : "circle", size: previous.kind === "template" ? previous.size : 20, side, maxTargets, ...range, ...(previous.kind === "template" && previous.zone ? { zone: previous.zone } : {}), ...(previous.kind === "template" && previous.hollow ? { hollow: true } : {}), ...(previous.kind === "template" ? previous.exact !== undefined && { exact: previous.exact } : exactDefault && { exact: true }) };

  return { kind, ...range } as SpellTargeting;
}

export function SpellFormPowerFields({ formData, setFormData, classesEnabled = false }: SpellFormFieldsProps & { classesEnabled?: boolean }) {
  const t = useTranslator();

  const { targeting, resolution } = formData;

  const tp = (key: string, values?: Record<string, string | number>) => t(`spellEditor.power.${key}`, values);

  const options = (keys: string[], prefix: string) => keys.map((k) => ({ value: k, label: t(`${prefix}.${k}`) }));

  const resolutionOptions = options(SPELL_RESOLUTION_KEYS, "spellEditor.power.resolution");

  const zone = targeting.kind === "template" ? targeting.zone : undefined;

  return (
    <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
      <div className="col-span-2">
        <Label htmlFor="dice">{tp("baseDice")}</Label>
        <BoundedNumberInput id="dice" min={0} max={40} value={formData.dice} onCommit={(dice) => setFormData({ ...formData, dice })} className="w-24" />
        <p className="mt-1 text-xs text-muted-foreground">{tp("baseDiceHint")}</p>
      </div>
      <div className="col-span-2">
        <Label htmlFor="targeting">{tp("targets")}</Label>
        <SelectField id="targeting" value={targeting.kind} onValueChange={(kind) => setFormData({ ...formData, targeting: targetingOf(kind, targeting, classesEnabled) })} placeholder={tp("targets")} options={options(TARGETING_KINDS, "spells.targeting")} />
      </div>
      {targeting.kind === "template" && (
        <>
          <div>
            <Label htmlFor="template-shape">{tp("shape")}</Label>
            <SelectField id="template-shape" value={targeting.shape} onValueChange={(shape) => setFormData({ ...formData, targeting: { ...targeting, shape: shape as TemplateShape, hollow: shape === "circle" ? targeting.hollow : undefined, exact: shape === "circle" ? targeting.exact ?? (classesEnabled || undefined) : undefined, ...(shape === "emanation" && { range: undefined }) } })} placeholder={tp("shape")} options={options(TEMPLATE_SHAPE_KEYS, "spells.shapes")} />
          </div>
          <div>
            <Label htmlFor="template-size">{tp("size")}</Label>
            <BoundedNumberInput id="template-size" min={5} max={120} value={targeting.size} onCommit={(v) => setFormData({ ...formData, targeting: { ...targeting, size: v } })} className="w-24" />
          </div>
        </>
      )}
      {targeting.kind === "template" && targeting.shape === "circle" && (
        <div className="col-span-2 flex items-center gap-2">
          <Switch id="template-exact" checked={!!targeting.exact} onCheckedChange={(on) => setFormData({ ...formData, targeting: { ...targeting, exact: on || undefined } })} />
          <Label htmlFor="template-exact">{tp("exact")}</Label>
        </div>
      )}
      {targeting.kind === "template" && targeting.shape === "circle" && (
        <div className="col-span-2 flex items-center gap-2">
          <Switch id="template-hollow" checked={!!targeting.hollow} onCheckedChange={(on) => setFormData({ ...formData, targeting: { ...targeting, hollow: on || undefined } })} />
          <Label htmlFor="template-hollow">{tp("hollow")}</Label>
        </div>
      )}
      {(targeting.kind === "area" || targeting.kind === "template") && (
        <>
          <div>
            <Label htmlFor="targeting-side">{tp(targeting.kind === "template" ? "sideNoMap" : "side")}</Label>
            <SelectField id="targeting-side" value={targeting.side} onValueChange={(side) => setFormData({ ...formData, targeting: { ...targeting, side: side as "ally" | "enemy" } })} placeholder={tp("side")} options={options(SPELL_SIDE_KEYS, "spellEditor.power.sides")} />
          </div>
          <div>
            <Label htmlFor="targeting-max">{tp(targeting.kind === "template" ? "maxTargetsNoMap" : "maxTargets")}</Label>
            <BoundedNumberInput id="targeting-max" min={1} max={20} value={targeting.maxTargets} onCommit={(v) => setFormData({ ...formData, targeting: { ...targeting, maxTargets: v } })} className="w-24" />
          </div>
        </>
      )}
      {targeting.kind === "area" && (
        <div className="col-span-2 flex items-center gap-2">
          <Switch id="targeting-chain" checked={!!targeting.chain} onCheckedChange={(on) => setFormData({ ...formData, targeting: { ...targeting, chain: on || undefined } })} />
          <Label htmlFor="targeting-chain">{tp("chain")}</Label>
        </div>
      )}
      {RANGED_KINDS.includes(targeting.kind) && !(targeting.kind === "template" && targeting.shape === "emanation") && (
        <div className="col-span-2">
          <Label htmlFor="spell-range">{tp("range")}</Label>
          <RangeInput value={(targeting as { range?: number }).range} onCommit={(range) => setFormData({ ...formData, targeting: { ...targeting, range } as SpellTargeting })} />
        </div>
      )}
      {targeting.kind === "template" && (
        <>
          <div className="col-span-2 flex items-center gap-2">
            <Switch id="zone-on" checked={!!targeting.zone} onCheckedChange={(on) => setFormData({ ...formData, targeting: { ...targeting, zone: on ? { rounds: 3 } : undefined } })} />
            <Label htmlFor="zone-on">{tp("zone")}</Label>
          </div>
          {zone && (
            <>
              <div>
                <Label htmlFor="zone-rounds">{tp("zoneRounds")}</Label>
                <BoundedNumberInput id="zone-rounds" min={1} max={10} value={zone.rounds} onCommit={(v) => setFormData({ ...formData, targeting: { ...targeting, zone: { ...zone, rounds: v } } })} className="w-24" />
              </div>
              <div>
                <Label htmlFor="zone-label">{tp("zoneLabel")}</Label>
                <Input id="zone-label" maxLength={60} value={zone.label ?? ""} onChange={(e) => setFormData({ ...formData, targeting: { ...targeting, zone: { ...zone, label: e.target.value || undefined } } })} />
              </div>
            </>
          )}
        </>
      )}
      <div className="col-span-2">
        <Label htmlFor="resolution">{tp("check")}</Label>
        <SelectField id="resolution" value={resolution.kind} onValueChange={(kind) => setFormData({ ...formData, resolution: kind === "save" ? { kind, ability: "dexterity", onSuccess: "half" } : kind === "attack" ? { kind } : { kind: "auto" } })} placeholder={tp("check")} options={classesEnabled || resolution.kind === "attack" ? resolutionOptions : resolutionOptions.filter((o) => o.value !== "attack")} />
      </div>
      {resolution.kind === "save" && (
        <>
          <div>
            <Label htmlFor="save-ability">{tp("saveAbility")}</Label>
            <SelectField id="save-ability" value={resolution.ability} onValueChange={(ability) => setFormData({ ...formData, resolution: { ...resolution, ability: ability as AbilityKey } })} placeholder={tp("saveAbility")} options={SAVE_ABILITY_KEYS.map((k) => ({ value: k, label: t(`common.abilities.${k}.label`) }))} />
          </div>
          <div>
            <Label htmlFor="save-on-success">{tp("onSuccess")}</Label>
            <SelectField id="save-on-success" value={resolution.onSuccess} onValueChange={(onSuccess) => setFormData({ ...formData, resolution: { ...resolution, onSuccess: onSuccess as "half" | "none" } })} placeholder={tp("onSuccess")} options={options(SAVE_ON_SUCCESS_KEYS, "spells.saveOnSuccess")} />
          </div>
        </>
      )}
      {(classesEnabled || formData.fixedDice !== undefined || formData.damageBonus != null) && (
        <div className="col-span-2">
          <HudSection title="5e">
            <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
              <label className="col-span-2 flex items-center gap-2"><Checkbox id="fixed-dice" checked={!!formData.fixedDice} onCheckedChange={(v) => setFormData({ ...formData, fixedDice: v === true })} />{tp("fixedDice")}</label>
              <div><Label htmlFor="damage-bonus">{tp("damageBonus")}</Label><Input id="damage-bonus" type="number" min={-20} max={40} value={formData.damageBonus ?? ""} onChange={(e) => setFormData({ ...formData, damageBonus: e.target.value === "" ? null : Math.max(-20, Math.min(40, Math.trunc(Number(e.target.value)))) })} /></div>
              <div className="col-span-2">
                <Label htmlFor="spell-lists">{tp("lists")}</Label>
                <CommaListInput id="spell-lists" placeholder="Wizard, Sorcerer" value={formData.lists ?? []} onChange={(lists) => setFormData({ ...formData, lists })} />
              </div>
              <div>
                <Label htmlFor="die-sides">{tp("dieSides")}</Label>
                <SelectField id="die-sides" value={formData.dieSides ? String(formData.dieSides) : ""} onValueChange={(v) => setFormData({ ...formData, dieSides: v ? parseInt(v) : null })} placeholder={tp("dieSidesDefault")} options={DIE_SIDES.map((n) => ({ value: String(n), label: tp("dieSide", { n }) }))} />
              </div>
              <div>
                <Label htmlFor="upcast-dice">{tp("upcastDice")}</Label>
                <Input id="upcast-dice" type="number" min={0} max={10} value={formData.upcastDice ?? ""} onChange={(e) => setFormData({ ...formData, upcastDice: e.target.value === "" ? null : clamp(parseInt(e.target.value) || 0, 0, 10) })} className="w-24" />
              </div>
              <div>
                <Label htmlFor="upcast-targets">{tp("upcastTargets")}</Label>
                <Input id="upcast-targets" type="number" min={0} max={10} value={formData.upcastTargets ?? ""} onChange={(e) => setFormData({ ...formData, upcastTargets: e.target.value === "" ? null : clamp(parseInt(e.target.value) || 0, 0, 10) })} className="w-24" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox id="add-ability-mod" checked={!!formData.addAbilityMod} onCheckedChange={(checked) => setFormData({ ...formData, addAbilityMod: checked === true })} />
                <Label htmlFor="add-ability-mod" className="cursor-pointer">{tp("addAbilityMod")}</Label>
              </div>
            </div>
          </HudSection>
        </div>
      )}
    </div>
  );
}
