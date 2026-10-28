"use client";

import { UnitKnownSpells } from "./UnitKnownSpells";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import { ABILITY_KEYS, ABILITY_LABELS } from "@/lib/constants/abilities";
import type { Spell } from "@/types/spells";
import type { Unit, UnitSpellcasting } from "@/types/units";

type Grant = UnitSpellcasting["spells"][number];

const LIMITS = [{ value: "will", label: "За бажанням" }, { value: "battle", label: "N за бій" }, { value: "recharge", label: "Перезарядка" }];

export function UnitSpellcastingFields({ formData, spells, onChange }: { formData: Partial<Unit>; spells: Spell[]; onChange: (data: Partial<Unit>) => void }) {
  const block = { ...formData.spellcasting, spells: formData.spellcasting?.spells ?? [] };

  const set = (patch: Partial<UnitSpellcasting>) => onChange({ spellcasting: { ...block, ...patch } });

  const update = (i: number, patch: Partial<Grant>) => set({ spells: block.spells.map((g, index) => index === i ? { ...g, ...patch } : g) });

  const numeric = (id: string, label: string, value: number | undefined, onValue: (v: number | undefined) => void, min: number, max: number) => <div key={id}><Label htmlFor={id}>{label}</Label><NumberInput id={id} value={value} min={min} max={max} onChange={(v) => onValue(v === undefined ? undefined : Math.max(min, Math.min(max, v)))} /></div>;

  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <div><Label htmlFor="spellcasting-ability">Характеристика блоку</Label><SelectField id="spellcasting-ability" value={block.ability ?? ""} allowNone noneLabel="Найкраща ментальна" options={ABILITY_KEYS.map((value) => ({ value, label: ABILITY_LABELS[value] }))} onValueChange={(v) => set({ ability: v === "none" ? undefined : v as UnitSpellcasting["ability"] })} /></div>
      {numeric("spellcasting-dc", "СК блоку", block.dc, (dc) => set({ dc }), 5, 30)}
      {numeric("spellcasting-attack", "Бонус атаки блоку", block.attackBonus, (attackBonus) => set({ attackBonus }), -5, 20)}
    </div>
    <SelectField value="" placeholder="Додати заклинання монстра" options={spells.filter((s) => !block.spells.some((g) => g.spellId === s.id)).map((s) => ({ value: s.id, label: s.name }))} onValueChange={(spellId) => set({ spells: [...block.spells, { spellId }] })} />
    {block.spells.map((grant, i) => {
      const name = spells.find((s) => s.id === grant.spellId)?.name ?? `Невідоме заклинання (${grant.spellId})`;

      const mode = grant.recharge ? "recharge" : grant.perBattle ? "battle" : "will";

      return <section key={grant.spellId} className="space-y-3 rounded border p-3">
        <div className="flex items-center justify-between gap-2"><h4 className="font-medium">{name}</h4><Button type="button" variant="ghost" size="sm" aria-label={`Видалити ${name}`} onClick={() => set({ spells: block.spells.filter((_, n) => n !== i) })}>Видалити</Button></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div><Label htmlFor={`grant-limit-${i}`}>Використання</Label><SelectField id={`grant-limit-${i}`} value={mode} options={LIMITS} onValueChange={(v) => update(i, { perBattle: v === "will" ? undefined : v === "recharge" ? 1 : grant.perBattle ?? 1, recharge: v === "recharge" ? grant.recharge ?? 5 : undefined })} /></div>
          {grant.perBattle !== undefined && numeric(`grant-count-${i}`, `${name}: використань за бій`, grant.perBattle, (v) => update(i, { perBattle: v ?? 1, recharge: v === 1 ? grant.recharge : undefined }), 1, 9)}
          {grant.recharge !== undefined && <div><Label htmlFor={`grant-recharge-${i}`}>Перезарядка</Label><SelectField id={`grant-recharge-${i}`} value={String(grant.recharge)} options={[4, 5, 6].map((v) => ({ value: String(v), label: `${v}–6` }))} onValueChange={(v) => update(i, { perBattle: 1, recharge: Number(v) as 4 | 5 | 6 })} /></div>}
          {numeric(`grant-level-${i}`, `${name}: коло касту`, grant.castLevel, (castLevel) => update(i, { castLevel }), 1, 9)}
          {numeric(`grant-dc-${i}`, `${name}: СК`, grant.dc, (dc) => update(i, { dc }), 5, 30)}
          {numeric(`grant-attack-${i}`, `${name}: бонус атаки`, grant.attackBonus, (attackBonus) => update(i, { attackBonus }), -5, 20)}
        </div>
        <label className="flex items-center gap-2"><Checkbox checked={!!grant.legendaryOnly} onCheckedChange={(v) => update(i, { legendaryOnly: v === true || undefined })} />Лише легендарна дія / дія лігва</label>
      </section>;
    })}
    <p className="text-sm text-muted-foreground">Додаткові відомі заклинання нижче доступні за бажанням. Порожні СК, коло й бонус використовують значення блоку.</p>
    <UnitKnownSpells formData={formData} spells={spells} onChange={onChange} />
  </div>;
}
