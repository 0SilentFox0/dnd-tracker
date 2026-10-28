import { spellCast } from "../../spell-cast";
import { deriveSpell } from "../../spell-derive";

const base = { name: "Synthetic Spell", source: "Test", level: 1, school: "N", time: [{ number: 1, unit: "action" }], range: { type: "point", distance: { type: "touch" } }, duration: [{ type: "instant" }] };

export function spellRow(entries: string[], extra: Record<string, unknown> = {}) {
  const row = { ...base, ...extra, entries };

  const text = entries.join(" ").replace(/\{@\w+ ([^}|]*)[^}]*\}/g, "$1");

  return deriveSpell(row, text, "", spellCast(row));
}
