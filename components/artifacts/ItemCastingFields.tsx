"use client";

import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ITEM_LIMITS } from "@/lib/constants/artifacts";
import { MAX_SPELL_LEVEL } from "@/lib/constants/spells";
import { useSpells } from "@/lib/hooks/spells";
import type { ItemStats } from "@/lib/utils/items/item-stats";

const PARAM_OPTIONS = {
  damageType: ["acid", "cold", "fire", "force", "lightning", "necrotic", "poison", "psychic", "radiant", "thunder", "bludgeoning", "piercing", "slashing"],
  creatureType: ["aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead"],
};

type ItemSpell = NonNullable<ItemStats["spells"]>[number];

const SPELL_NUMBER_FIELDS = [["cost", "Ціна"], ["castLevel", "Коло"], ["dc", "DC"], ["attackBonus", "Бонус атаки"]] as const;

export function ItemCastingFields({ campaignId, value, onChange }: { campaignId: string; value: ItemStats; onChange: (patch: Partial<ItemStats>) => void }) {
  const { data: library = [] } = useSpells(campaignId);

  const spells = value.spells ?? [];

  const setSpell = (index: number, patch: Partial<ItemSpell>) => onChange({ spells: spells.map((s, i) => i === index ? { ...s, ...patch } : s) });

  return <div className="space-y-3">
    <label className="block text-xs">Параметр при видачі<select aria-label="Вид параметра предмета" className={HUD_SELECT_CLASS} value={value.parameter?.kind ?? ""} onChange={(e) => {
      const kind = e.target.value as "damageType" | "creatureType";

      const key = kind === "damageType" ? "fire" : "dragon";

      onChange({ parameter: kind ? { kind, options: [{ key, label: key }] } : undefined });
    }}><option value="">Без параметра</option><option value="damageType">Тип шкоди</option><option value="creatureType">Тип істоти</option></select></label>
    {value.parameter && <div className="flex flex-wrap gap-1">{PARAM_OPTIONS[value.parameter.kind].map((key) => <Button key={key} type="button" variant={value.parameter?.options.some((o) => o.key === key) ? "default" : "outline"} size="sm" onClick={() => {
      const parameter = value.parameter;

      if (!parameter) return;

      const options = parameter.options.some((o) => o.key === key) ? parameter.options.filter((o) => o.key !== key) : [...parameter.options, { key, label: key }];

      if (options.length) onChange({ parameter: { ...parameter, options } });
    }}>{key}</Button>)}</div>}
    {spells.map((spell, index) => <fieldset key={spell.spellId} className="space-y-2 rounded border border-hud-line p-2">
      <select aria-label="Заклинання предмета" className={`${HUD_SELECT_CLASS} w-full`} value={spell.spellId} onChange={(e) => setSpell(index, { spellId: e.target.value })}>
        {!library.some((s) => s.id === spell.spellId) && <option value={spell.spellId}>Заклинання не знайдено</option>}
        {library.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SPELL_NUMBER_FIELDS.map(([key, label]) => {
          const [min, max] = ITEM_LIMITS[key];

          return (
            <label key={key} className="text-xs">
              {label}
              <Input aria-label={`${label} предмета`} type="number" min={min} max={max} value={spell[key] ?? ""} onChange={(e) => setSpell(index, { [key]: e.target.value === "" ? undefined : Number(e.target.value) })} />
            </label>
          );
        })}
      </div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!spell.upcast} onChange={(e) => setSpell(index, { upcast: e.target.checked ? { maxLevel: Math.min(MAX_SPELL_LEVEL, (spell.castLevel ?? 0) + 1), extraCost: 1 } : undefined })} />Дозволити підсилення</label>
      {spell.upcast && <div className="grid grid-cols-2 gap-2"><label className="text-xs">Максимальне коло<Input aria-label="Максимальне коло предмета" type="number" min={ITEM_LIMITS.upcastMaxLevel[0]} max={ITEM_LIMITS.upcastMaxLevel[1]} value={spell.upcast.maxLevel} onChange={(e) => setSpell(index, { upcast: { maxLevel: Number(e.target.value), extraCost: spell.upcast?.extraCost ?? 1 } })} /></label><label className="text-xs">Ціна додаткового кола<Input aria-label="Ціна додаткового кола" type="number" min={ITEM_LIMITS.upcastExtraCost[0]} max={ITEM_LIMITS.upcastExtraCost[1]} value={spell.upcast.extraCost} onChange={(e) => setSpell(index, { upcast: { maxLevel: spell.upcast?.maxLevel ?? MAX_SPELL_LEVEL, extraCost: Number(e.target.value) } })} /></label></div>}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ spells: spells.filter((_, i) => i !== index) })}>Прибрати заклинання предмета</Button>
    </fieldset>)}
    <Button type="button" variant="outline" size="sm" disabled={library.every((s) => spells.some((g) => g.spellId === s.id))} onClick={() => {
      const next = library.find((s) => !spells.some((g) => g.spellId === s.id));

      if (next) onChange({ spells: [...spells, { spellId: next.id, cost: value.charges || value.consumable ? 1 : 0, castLevel: next.level }] });
    }}>Додати заклинання предмета</Button>
    {value.consumable && spells.length > 0 && <p className="text-xs text-hud-muted">Право читати сувій визначає ДМ. Каст і списання автоматизовано.</p>}
  </div>;
}
