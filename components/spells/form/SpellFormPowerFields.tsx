"use client";

import { DIE_SIDES } from "./spell-form-defaults";
import type { SpellFormFieldsProps } from "./SpellFormBasicFields";
import { SpellTargetingFields } from "./SpellTargetingFields";

import { HudSection } from "@/components/hud/form";
import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Checkbox } from "@/components/ui/checkbox";
import { CommaListInput } from "@/components/ui/comma-list-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { useTranslator } from "@/lib/i18n/use-translator";

const clamp = (raw: string, min: number, max: number, fallback: number) => Math.max(min, Math.min(max, parseInt(raw) || fallback));

export function SpellFormPowerFields({ formData, setFormData, classesEnabled = false }: SpellFormFieldsProps & { classesEnabled?: boolean }) {
  const t = useTranslator();

  const { targeting, resolution } = formData;

  const tp = (key: string, values?: Record<string, string | number>) => t(`spellEditor.power.${key}`, values);

  const zone = targeting.kind === "template" ? targeting.zone : undefined;

  return (
    <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
      <div className="col-span-2">
        <Label htmlFor="dice">{tp("baseDice")}</Label>
        <BoundedNumberInput id="dice" min={0} max={40} value={formData.dice} onCommit={(dice) => setFormData({ ...formData, dice })} className="w-24" />
        <p className="mt-1 text-xs text-muted-foreground">{tp("baseDiceHint")}</p>
      </div>
      <SpellTargetingFields value={{ targeting, resolution }} onChange={(next) => setFormData({ ...formData, ...next })} classesEnabled={classesEnabled}>
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
      </SpellTargetingFields>
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
                <Input id="upcast-dice" type="number" min={0} max={10} value={formData.upcastDice ?? ""} onChange={(e) => setFormData({ ...formData, upcastDice: e.target.value === "" ? null : clamp(e.target.value, 0, 10, 0) })} className="w-24" />
              </div>
              <div>
                <Label htmlFor="upcast-targets">{tp("upcastTargets")}</Label>
                <Input id="upcast-targets" type="number" min={0} max={10} value={formData.upcastTargets ?? ""} onChange={(e) => setFormData({ ...formData, upcastTargets: e.target.value === "" ? null : clamp(e.target.value, 0, 10, 0) })} className="w-24" />
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
