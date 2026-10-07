import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import type { AbilityKey } from "@/types/characters";

export function PrimaryAbilityPicker({ value, onChange }: { value: AbilityKey | null; onChange: (v: AbilityKey | null) => void }) {
  return (
    <fieldset className="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
      <legend className="mb-1 text-xs text-muted-foreground">Основна характеристика — від неї влучання і шкода всіх атак</legend>
      {CORE_ABILITY_SCORES.map((a) => (
        <label key={a.key} className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" aria-label={`${a.label} — основна`} checked={value === a.key} onChange={() => onChange(value === a.key ? null : a.key)} className="size-5 accent-hud-gold" />
          {a.label}
        </label>
      ))}
    </fieldset>
  );
}
