"use client";

import { useState } from "react";

import { SAVE_ABILITY_OPTIONS, SAVE_ON_SUCCESS_OPTIONS, TARGETING_KIND_OPTIONS } from "./spell-form-defaults";
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
import { labelOptions, TEMPLATE_SHAPE_LABELS } from "@/lib/constants/spells";
import type { TemplateShape } from "@/types/battle";
import type { SpellTargeting } from "@/types/spells";

const RANGED_KINDS = ["ally", "enemy", "allyDead", "area", "template"];

const SHAPE_OPTIONS = labelOptions(TEMPLATE_SHAPE_LABELS);

const resolutionOptions = [{ value: "auto", label: "Автоматично" }, { value: "save", label: "Рятівний кидок цілі" }, { value: "attack", label: "Атака заклинанням" }];

const SIDE_OPTIONS = [{ value: "enemy", label: "Вороги" }, { value: "ally", label: "Союзники" }];

const DIE_SIDES_OPTIONS = [4, 6, 8, 10, 12].map((n) => ({ value: String(n), label: `к${n}` }));

const clamp = (raw: string, min: number, max: number, fallback: number) => Math.max(min, Math.min(max, parseInt(raw) || fallback));

function RangeInput({ value, onCommit }: { value: number | undefined; onCommit: (value: number | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;

    setDraft(null);

    const n = parseInt(draft);

    onCommit(Number.isFinite(n) ? Math.max(5, Math.min(600, n)) : undefined);
  };

  return <Input id="spell-range" type="number" min={5} max={600} step={5} placeholder="без обмеження" value={draft ?? value ?? ""} onChange={(e) => setDraft(e.target.value)} onBlur={commit} className="w-40" />;
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
  const { targeting, resolution } = formData;

  const zone = targeting.kind === "template" ? targeting.zone : undefined;

  return (
    <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
      <div className="col-span-2">
        <Label htmlFor="dice">Базові кубики N</Label>
        <BoundedNumberInput id="dice" min={0} max={40} value={formData.dice} onCommit={(dice) => setFormData({ ...formData, dice })} className="w-24" />
        <p className="mt-1 text-xs text-muted-foreground">Герой: N + ⌊рівень / 3⌋ кубиків, грані — від майстерності школи (к6 / к8 / к10). Юніт: N + ⌊рівень / 2⌋ кубиків, грані — від рівня (1–4 к6, 5–9 к8, 10+ к10). 0 — без кубиків.</p>
      </div>
      <div className="col-span-2">
        <Label htmlFor="targeting">Цілі</Label>
        <SelectField id="targeting" value={targeting.kind} onValueChange={(kind) => setFormData({ ...formData, targeting: targetingOf(kind, targeting, classesEnabled) })} placeholder="Цілі" options={TARGETING_KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
      </div>
      {targeting.kind === "template" && (
        <>
          <div>
            <Label htmlFor="template-shape">Форма</Label>
            <SelectField id="template-shape" value={targeting.shape} onValueChange={(shape) => setFormData({ ...formData, targeting: { ...targeting, shape: shape as TemplateShape, hollow: shape === "circle" ? targeting.hollow : undefined, exact: shape === "circle" ? targeting.exact ?? (classesEnabled || undefined) : undefined, ...(shape === "emanation" && { range: undefined }) } })} placeholder="Форма" options={SHAPE_OPTIONS} />
          </div>
          <div>
            <Label htmlFor="template-size">Розмір, фути</Label>
            <BoundedNumberInput id="template-size" min={5} max={120} value={targeting.size} onCommit={(v) => setFormData({ ...formData, targeting: { ...targeting, size: v } })} className="w-24" />
          </div>
        </>
      )}
      {targeting.kind === "template" && targeting.shape === "circle" && (
        <div className="col-span-2 flex items-center gap-2">
          <Switch id="template-exact" checked={!!targeting.exact} onCheckedChange={(on) => setFormData({ ...formData, targeting: { ...targeting, exact: on || undefined } })} />
          <Label htmlFor="template-exact">Точна площа 5e</Label>
        </div>
      )}
      {targeting.kind === "template" && targeting.shape === "circle" && (
        <div className="col-span-2 flex items-center gap-2">
          <Switch id="template-hollow" checked={!!targeting.hollow} onCheckedChange={(on) => setFormData({ ...formData, targeting: { ...targeting, hollow: on || undefined } })} />
          <Label htmlFor="template-hollow">Кільце: центральна клітинка не вражається</Label>
        </div>
      )}
      {(targeting.kind === "area" || targeting.kind === "template") && (
        <>
          <div>
            <Label htmlFor="targeting-side">{targeting.kind === "template" ? "Без карти: сторона" : "Сторона"}</Label>
            <SelectField id="targeting-side" value={targeting.side} onValueChange={(side) => setFormData({ ...formData, targeting: { ...targeting, side: side as "ally" | "enemy" } })} placeholder="Сторона" options={SIDE_OPTIONS} />
          </div>
          <div>
            <Label htmlFor="targeting-max">{targeting.kind === "template" ? "Без карти: макс. цілей" : "Макс. цілей"}</Label>
            <BoundedNumberInput id="targeting-max" min={1} max={20} value={targeting.maxTargets} onCommit={(v) => setFormData({ ...formData, targeting: { ...targeting, maxTargets: v } })} className="w-24" />
          </div>
        </>
      )}
      {targeting.kind === "area" && (
        <div className="col-span-2 flex items-center gap-2">
          <Switch id="targeting-chain" checked={!!targeting.chain} onCheckedChange={(on) => setFormData({ ...formData, targeting: { ...targeting, chain: on || undefined } })} />
          <Label htmlFor="targeting-chain">Ланцюг: наступна найближча ціль</Label>
        </div>
      )}
      {RANGED_KINDS.includes(targeting.kind) && !(targeting.kind === "template" && targeting.shape === "emanation") && (
        <div className="col-span-2">
          <Label htmlFor="spell-range">Дальність, фути</Label>
          <RangeInput value={(targeting as { range?: number }).range} onCommit={(range) => setFormData({ ...formData, targeting: { ...targeting, range } as SpellTargeting })} />
        </div>
      )}
      {targeting.kind === "template" && (
        <>
          <div className="col-span-2 flex items-center gap-2">
            <Switch id="zone-on" checked={!!targeting.zone} onCheckedChange={(on) => setFormData({ ...formData, targeting: { ...targeting, zone: on ? { rounds: 3 } : undefined } })} />
            <Label htmlFor="zone-on">Лишає небезпеку</Label>
          </div>
          {zone && (
            <>
              <div>
                <Label htmlFor="zone-rounds">Раундів</Label>
                <BoundedNumberInput id="zone-rounds" min={1} max={10} value={zone.rounds} onCommit={(v) => setFormData({ ...formData, targeting: { ...targeting, zone: { ...zone, rounds: v } } })} className="w-24" />
              </div>
              <div>
                <Label htmlFor="zone-label">Підпис</Label>
                <Input id="zone-label" maxLength={60} value={zone.label ?? ""} onChange={(e) => setFormData({ ...formData, targeting: { ...targeting, zone: { ...zone, label: e.target.value || undefined } } })} />
              </div>
            </>
          )}
        </>
      )}
      <div className="col-span-2">
        <Label htmlFor="resolution">Перевірка</Label>
        <SelectField id="resolution" value={resolution.kind} onValueChange={(kind) => setFormData({ ...formData, resolution: kind === "save" ? { kind, ability: "dexterity", onSuccess: "half" } : kind === "attack" ? { kind } : { kind: "auto" } })} placeholder="Перевірка" options={classesEnabled || resolution.kind === "attack" ? resolutionOptions : resolutionOptions.filter((o) => o.value !== "attack")} />
      </div>
      {resolution.kind === "save" && (
        <>
          <div>
            <Label htmlFor="save-ability">Характеристика (DC = 8 + майстерність + мод. заклинателя)</Label>
            <SelectField id="save-ability" value={resolution.ability} onValueChange={(ability) => setFormData({ ...formData, resolution: { ...resolution, ability: ability as AbilityKey } })} placeholder="Характеристика" options={SAVE_ABILITY_OPTIONS} />
          </div>
          <div>
            <Label htmlFor="save-on-success">При успіху</Label>
            <SelectField id="save-on-success" value={resolution.onSuccess} onValueChange={(onSuccess) => setFormData({ ...formData, resolution: { ...resolution, onSuccess: onSuccess as "half" | "none" } })} placeholder="При успіху" options={SAVE_ON_SUCCESS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          </div>
        </>
      )}
      {(classesEnabled || formData.fixedDice !== undefined || formData.damageBonus != null) && (
        <div className="col-span-2">
          <HudSection title="5e">
            <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
              <label className="col-span-2 flex items-center gap-2"><Checkbox id="fixed-dice" checked={!!formData.fixedDice} onCheckedChange={(v) => setFormData({ ...formData, fixedDice: v === true })} />Фіксовані кубики</label>
              <div><Label htmlFor="damage-bonus">Добавка до шкоди / лікування</Label><Input id="damage-bonus" type="number" min={-20} max={40} value={formData.damageBonus ?? ""} onChange={(e) => setFormData({ ...formData, damageBonus: e.target.value === "" ? null : Math.max(-20, Math.min(40, Math.trunc(Number(e.target.value)))) })} /></div>
              <div className="col-span-2">
                <Label htmlFor="spell-lists">Списки</Label>
                <CommaListInput id="spell-lists" placeholder="Wizard, Sorcerer" value={formData.lists ?? []} onChange={(lists) => setFormData({ ...formData, lists })} />
              </div>
              <div>
                <Label htmlFor="die-sides">Грань кубика</Label>
                <SelectField id="die-sides" value={formData.dieSides ? String(formData.dieSides) : ""} onValueChange={(v) => setFormData({ ...formData, dieSides: v ? parseInt(v) : null })} placeholder="к6 (типово)" options={DIE_SIDES_OPTIONS} />
              </div>
              <div>
                <Label htmlFor="upcast-dice">+кубиків за коло</Label>
                <Input id="upcast-dice" type="number" min={0} max={10} value={formData.upcastDice ?? ""} onChange={(e) => setFormData({ ...formData, upcastDice: e.target.value === "" ? null : clamp(e.target.value, 0, 10, 0) })} className="w-24" />
              </div>
              <div>
                <Label htmlFor="upcast-targets">+цілей за коло</Label>
                <Input id="upcast-targets" type="number" min={0} max={10} value={formData.upcastTargets ?? ""} onChange={(e) => setFormData({ ...formData, upcastTargets: e.target.value === "" ? null : clamp(e.target.value, 0, 10, 0) })} className="w-24" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox id="add-ability-mod" checked={!!formData.addAbilityMod} onCheckedChange={(checked) => setFormData({ ...formData, addAbilityMod: checked === true })} />
                <Label htmlFor="add-ability-mod" className="cursor-pointer">Додати модифікатор характеристики</Label>
              </div>
            </div>
          </HudSection>
        </div>
      )}
    </div>
  );
}
