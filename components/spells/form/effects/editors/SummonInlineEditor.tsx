"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";
import { SpellOnlyField } from "../SpellOnlyField";
import { ZoneTriggerEditor } from "../ZoneTriggerEditor";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslator } from "@/lib/i18n/use-translator";
import { SUMMON_INLINE_SIZES } from "@/lib/utils/spells/model/schema";

type SummonInline = SpellOnlyEditorProps<"summonInline">["effect"];

type InlineAttack = NonNullable<SummonInline["attacks"]>[number];

const NEW_ATTACK: InlineAttack = { name: "N", attackBonus: 4, damageDice: "1d6", damageType: "bludgeoning" };

const toNumber = (v: string, fallback: number) => (v === "" ? fallback : Number(v));

export function SummonInlineEditor({ effect, path, onChange }: SpellOnlyEditorProps<"summonInline">) {
  const t = useTranslator("editors");

  const { attacks = [], aura } = effect;

  const owner = { kind: "summonInline", effect, path } as const;

  const setAttack = (i: number, patch: Partial<InlineAttack>) => {
    const next = attacks.map((a, idx) => (idx === i ? { ...a, ...patch } : a));

    onChange({ ...effect, attacks: next });
  };

  const removeAttack = (i: number) => {
    const next = attacks.filter((_, idx) => idx !== i);

    onChange({ ...effect, attacks: next.length ? next : undefined });
  };

  return (
    <>
      <SpellOnlyField owner={owner} field={{ name: "name", input: "text" }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "size", input: "select", options: SUMMON_INLINE_SIZES }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "count", input: "number" }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "upcastEvery", input: "number" }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "duration", input: "duration" }} onChange={onChange} />
      <div className="col-span-3 space-y-1">
        <Label htmlFor={`${path}.ac`} className="text-xs text-muted-foreground">
          {t("spellEffects.fields.summonInline.ac")}
        </Label>
        <div className="flex items-center gap-2">
          <Switch id={`${path}.ac.spellDc`} aria-label={t("spellEffects.fields.summonInline.acSpellDc")} checked={effect.ac === "spellDc"} onCheckedChange={(on) => onChange({ ...effect, ac: on ? "spellDc" : 10 })} />
          <span className="text-xs">{t("spellEffects.fields.summonInline.acSpellDc")}</span>
          {effect.ac !== "spellDc" && <Input id={`${path}.ac`} type="number" value={effect.ac} onChange={(e) => onChange({ ...effect, ac: toNumber(e.target.value, 10) })} />}
        </div>
      </div>
      <div className="col-span-3 space-y-1">
        <Label htmlFor={`${path}.hp`} className="text-xs text-muted-foreground">
          {t("spellEffects.fields.summonInline.hp")}
        </Label>
        <div className="flex items-center gap-2">
          <Switch id={`${path}.hp.item`} aria-label={t("spellEffects.fields.summonInline.hpItem")} checked={effect.hp === null} onCheckedChange={(on) => onChange({ ...effect, hp: on ? null : 10 })} />
          <span className="text-xs">{t("spellEffects.fields.summonInline.hpItem")}</span>
          {effect.hp !== null && <Input id={`${path}.hp`} type="number" value={effect.hp} onChange={(e) => onChange({ ...effect, hp: toNumber(e.target.value, 10) })} />}
        </div>
      </div>
      <div className="col-span-6 space-y-2">
        <p className="text-xs font-medium">{t("spellEffects.fields.summonInline.attacks")}</p>
        {attacks.map((a, i) => (
          <div key={i} className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0" data-testid={`${path}.attacks.${i}`}>
            <div className="col-span-2">
              <Label htmlFor={`${path}.attacks.${i}.name`} className="text-xs text-muted-foreground">
                {t("spellEffects.fields.summonInline.attack.name")}
              </Label>
              <Input id={`${path}.attacks.${i}.name`} value={a.name} onChange={(e) => setAttack(i, { name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={`${path}.attacks.${i}.attackBonus`} className="text-xs text-muted-foreground">
                {t("spellEffects.fields.summonInline.attack.attackBonus")}
              </Label>
              <Input id={`${path}.attacks.${i}.attackBonus`} type="number" value={a.attackBonus} onChange={(e) => setAttack(i, { attackBonus: toNumber(e.target.value, 0) })} />
            </div>
            <div>
              <Label htmlFor={`${path}.attacks.${i}.damageDice`} className="text-xs text-muted-foreground">
                {t("spellEffects.fields.summonInline.attack.damageDice")}
              </Label>
              <Input id={`${path}.attacks.${i}.damageDice`} value={a.damageDice} onChange={(e) => setAttack(i, { damageDice: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={`${path}.attacks.${i}.damageType`} className="text-xs text-muted-foreground">
                {t("spellEffects.fields.summonInline.attack.damageType")}
              </Label>
              <Input id={`${path}.attacks.${i}.damageType`} value={a.damageType} onChange={(e) => setAttack(i, { damageType: e.target.value })} />
            </div>
            <div className="flex items-end gap-1">
              <div className="min-w-0 flex-1">
                <Label htmlFor={`${path}.attacks.${i}.range`} className="text-xs text-muted-foreground">
                  {t("spellEffects.fields.summonInline.attack.range")}
                </Label>
                <Input id={`${path}.attacks.${i}.range`} value={a.range ?? ""} onChange={(e) => setAttack(i, { range: e.target.value || undefined })} />
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label={t("spellEffects.fields.summonInline.removeAttack")} onClick={() => removeAttack(i)}>
                ×
              </Button>
            </div>
          </div>
        ))}
        {attacks.length < 2 && (
          <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...effect, attacks: [...attacks, { ...NEW_ATTACK }] })}>
            {t("spellEffects.fields.summonInline.addAttack")}
          </Button>
        )}
      </div>
      <div className="col-span-6 flex items-center gap-2">
        <Switch id={`${path}.aura.on`} checked={!!aura} onCheckedChange={(on) => onChange({ ...effect, aura: on ? { radiusFeet: 10, side: "enemies" } : undefined })} />
        <Label htmlFor={`${path}.aura.on`}>{t("spellEffects.fields.summonInline.auraToggle")}</Label>
      </div>
      {aura && (
        <>
          <SpellOnlyField owner={owner} field={{ name: "aura.radiusFeet", input: "number" }} onChange={onChange} />
          <SpellOnlyField owner={owner} field={{ name: "aura.side", input: "select", options: ["enemies", "allies", "all"] }} onChange={onChange} />
          <ZoneTriggerEditor value={aura.onEnter} path={`${path}.aura.onEnter`} label={t("spellEffects.fields.summonInline.aura.onEnter")} onChange={(onEnter) => onChange({ ...effect, aura: { ...aura, onEnter } })} />
          <ZoneTriggerEditor value={aura.onTurnStart} path={`${path}.aura.onTurnStart`} label={t("spellEffects.fields.summonInline.aura.onTurnStart")} onChange={(onTurnStart) => onChange({ ...effect, aura: { ...aura, onTurnStart } })} />
        </>
      )}
    </>
  );
}
