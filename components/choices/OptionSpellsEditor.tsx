"use client";

import { Plus, Trash2 } from "lucide-react";

import { SpellGrantEditor } from "./SpellGrantEditor";

import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { useSpells } from "@/lib/hooks/spells";
import type { ChoiceOption } from "@/types/choices";

type Spells = NonNullable<ChoiceOption["spells"]>;

export function OptionSpellsEditor({ campaignId, value, onChange }: { campaignId: string; value: Spells; onChange: (next: Spells) => void }) {
  const { data: spells = [] } = useSpells(campaignId);

  const set = (i: number, patch: Partial<Spells[number]>) => onChange(value.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="space-y-2"><div className="flex items-center gap-2">
          <Input type="number" min={1} max={MAX_CLASS_LEVEL} aria-label="Загальний рівень" className="w-20" value={row.level} onChange={(e) => set(i, { level: Number(e.target.value) || 1 })} />
          <select aria-label="Заклинання" className={HUD_SELECT_CLASS} value={row.spellId} onChange={(e) => set(i, { spellId: e.target.value })}>
            {spells.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.level})
              </option>
            ))}
            {!spells.some((s) => s.id === row.spellId) && <option value={row.spellId}>Заклинання не знайдено</option>}
          </select>
          <Button type="button" variant="ghost" size="sm" aria-label="Прибрати заклинання" onClick={() => onChange(value.filter((_, k) => k !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div><SpellGrantEditor value={row.grant} onChange={(grant) => set(i, { grant })} /></div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={spells.length === 0} onClick={() => onChange([...value, { level: 1, spellId: spells[0]?.id ?? "" }])}>
        <Plus className="h-4 w-4" />
        Додати заклинання
      </Button>
    </div>
  );
}
