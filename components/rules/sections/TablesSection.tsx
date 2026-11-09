import { useState } from "react";
import { Plus, X } from "lucide-react";

import { RulesSection } from "../RulesSection";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { CHARACTERISTIC_KEYS } from "@/lib/constants/wfrp-characteristics";
import { WFRP_CONDITION_KEYS, WFRP_CONDITION_MAX_LEVEL } from "@/lib/constants/wfrp-conditions";
import { MUTATION_EFFECT_LIMITS } from "@/lib/constants/wfrp-mutations";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { useTranslator } from "@/lib/i18n/use-translator";
import { DEFAULT_TABLES } from "@/lib/utils/rules/systems";
import { MARKER_KEYS, SLOT_EFFECTS, TABLE_SLOTS, type TableEffect, type TableRow, type TableSlot } from "@/lib/utils/rules/tables-schema";

const MAX_ROWS = 20;

const MAX_EFFECTS = 4;

const newEffect = (type: TableEffect["type"]): TableEffect => {
  if (type === "condition") return { type, key: WFRP_CONDITION_KEYS[0], levels: 1 };

  if (type === "marker") return { type, key: MARKER_KEYS[0] };

  if (type === "characteristic") return { type, key: CHARACTERISTIC_KEYS[0], amount: -5 };

  if (type === "move" || type === "maxWounds") return { type, amount: -1 };

  return { type, amount: 1 };
};

const nonZero = (n: number, prev: number) => n || (prev < 0 ? -1 : 1);

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

const withLastHundred = (rows: TableRow[]) => rows.map((r, i) => (i === rows.length - 1 ? { ...r, max: 100 } : r));

function EffectFields({ slot, effect, onChange, onRemove }: { slot: TableSlot; effect: TableEffect; onChange: (next: TableEffect) => void; onRemove: () => void }) {
  const t = useTranslator("wfrpTables");

  const tt = useTranslator();

  return (
    <li className="flex flex-wrap items-center gap-2">
      <SelectField aria-label={t("effectType")} value={effect.type} options={SLOT_EFFECTS[slot].map((type) => ({ value: type, label: t(`effect.${type}`) }))} onValueChange={(type) => onChange(newEffect(type as TableEffect["type"]))} triggerClassName="min-h-11 w-40" />
      {(effect.type === "damage" || effect.type === "wounds") && <BoundedNumberInput className="min-h-11 w-20" aria-label={t("amount")} min={1} max={20} value={effect.amount} onCommit={(amount) => onChange({ ...effect, amount })} />}
      {effect.type === "condition" && (
        <>
          <SelectField aria-label={t("condition")} value={effect.key} options={WFRP_CONDITION_KEYS.map((key) => ({ value: key, label: tt(`battleWfrp.conditions.${key}.label`) }))} onValueChange={(key) => onChange({ ...effect, key: key as typeof effect.key })} triggerClassName="min-h-11 w-40" />
          <BoundedNumberInput className="min-h-11 w-20" aria-label={t("levels")} min={1} max={WFRP_CONDITION_MAX_LEVEL} value={effect.levels} onCommit={(levels) => onChange({ ...effect, levels })} />
        </>
      )}
      {effect.type === "characteristic" && (
        <>
          <SelectField aria-label={t("characteristic")} value={effect.key} options={CHARACTERISTIC_KEYS.map((key) => ({ value: key, label: tt(`gameTerms.characteristics.${key}.short`) }))} onValueChange={(key) => onChange({ ...effect, key: key as typeof effect.key })} triggerClassName="min-h-11 w-40" />
          <BoundedNumberInput className="min-h-11 w-20" aria-label={t("amount")} min={-MUTATION_EFFECT_LIMITS.characteristic} max={MUTATION_EFFECT_LIMITS.characteristic} value={effect.amount} onCommit={(amount) => onChange({ ...effect, amount: nonZero(amount, effect.amount) })} />
        </>
      )}
      {(effect.type === "move" || effect.type === "maxWounds") && <BoundedNumberInput className="min-h-11 w-20" aria-label={t("amount")} min={-MUTATION_EFFECT_LIMITS[effect.type]} max={MUTATION_EFFECT_LIMITS[effect.type]} value={effect.amount} onCommit={(amount) => onChange({ ...effect, amount: nonZero(amount, effect.amount) })} />}
      {effect.type === "marker" && <SelectField aria-label={t("marker")} value={effect.key} options={MARKER_KEYS.map((key) => ({ value: key, label: t(`markers.${key}`) }))} onValueChange={(key) => onChange({ ...effect, key: key as typeof effect.key })} triggerClassName="min-h-11 w-40" />}
      <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={t("removeEffect")} onClick={onRemove}>
        <X className="size-4" />
      </Button>
    </li>
  );
}

function RowFields({ slot, row, index, from, isLast, canRemove, onChange, onRemove }: { slot: TableSlot; row: TableRow; index: number; from: number; isLast: boolean; canRemove: boolean; onChange: (next: TableRow) => void; onRemove: () => void }) {
  const t = useTranslator("wfrpTables");

  return (
    <li className="space-y-2 rounded border border-hud-border p-2">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <span className="text-sm text-hud-muted">{t("from", { n: from })}</span>
        <BoundedNumberInput className="min-h-11" aria-label={t("upTo", { n: index + 1 })} min={from} max={100} value={row.max} disabled={isLast} onCommit={(max) => onChange({ ...row, max })} />
        <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={!canRemove} aria-label={t("removeRow", { n: index + 1 })} onClick={onRemove}>
          <X className="size-4" />
        </Button>
      </div>
      <Input className="min-h-11" aria-label={t("text", { n: index + 1 })} maxLength={200} value={row.text ?? ""} onChange={(e) => onChange({ ...row, text: e.target.value })} />
      <ul className="space-y-1">
        {row.effects.map((effect, i) => (
          <EffectFields key={i} slot={slot} effect={effect} onChange={(next) => onChange({ ...row, effects: row.effects.map((x, j) => (j === i ? next : x)) })} onRemove={() => onChange({ ...row, effects: row.effects.filter((_, j) => j !== i) })} />
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={row.effects.length >= MAX_EFFECTS} onClick={() => onChange({ ...row, effects: [...row.effects, newEffect(SLOT_EFFECTS[slot][0])] })}>
        <Plus className="mr-1 size-4" />
        {t("addEffect")}
      </Button>
    </li>
  );
}

function DefaultRows({ slot }: { slot: TableSlot }) {
  const t = useTranslator("wfrpTables");

  const tt = useTranslator();

  const effectText = (e: TableEffect) => {
    if (e.type === "condition") return `${tt(`battleWfrp.conditions.${e.key}.label`)} ${e.levels}`;

    if (e.type === "marker") return t(`markers.${e.key}`);

    if (e.type === "characteristic") return `${tt(`gameTerms.characteristics.${e.key}.short`)} ${signed(e.amount)}`;

    if (e.type === "move" || e.type === "maxWounds") return `${t(`effect.${e.type}`)} ${signed(e.amount)}`;

    return `${t(`effect.${e.type}`)} ${e.amount}`;
  };

  return (
    <ul className="space-y-1 text-sm">
      {DEFAULT_TABLES[slot].map((row, i, rows) => (
        <li key={row.max} className="rounded border border-hud-border p-2">
          <span className="text-hud-muted">{`${i === 0 ? 1 : rows[i - 1].max + 1}-${row.max}`}</span> {row.textKey ? tt(row.textKey) : row.text}
          <div className="text-xs text-hud-muted">{row.effects.map(effectText).join(", ")}</div>
        </li>
      ))}
    </ul>
  );
}

export function TablesSection({ form }: { form: RulesFormState }) {
  const t = useTranslator("wfrpTables");

  const tt = useTranslator();

  const [slot, setSlot] = useState<TableSlot>(TABLE_SLOTS[0]);

  const tables = form.data.tables;

  const rows = tables[slot];

  const setRows = (next: TableRow[] | null) => form.set("tables", { ...tables, [slot]: next });

  const customize = () =>
    setRows(
      DEFAULT_TABLES[slot].map(({ textKey, ...row }) => {
        const translated = textKey ? tt(textKey) : row.text;

        return translated && translated !== textKey ? { ...row, text: translated } : row;
      }),
    );

  const secondLast = rows && rows.length > 1 ? rows[rows.length - 2].max : 0;

  return (
    <RulesSection mechanic="tables">
      <SelectField aria-label={t("slot")} value={slot} options={TABLE_SLOTS.map((s) => ({ value: s, label: t(`slots.${s}`) }))} onValueChange={(s) => setSlot(s as TableSlot)} triggerClassName="min-h-11" />
      {rows ? (
        <>
          <p className="text-xs text-hud-muted">{t("customHint")}</p>
          <ul className="space-y-2">
            {rows.map((row, i) => (
              <RowFields
                key={i}
                slot={slot}
                row={row}
                index={i}
                from={i === 0 ? 1 : rows[i - 1].max + 1}
                isLast={i === rows.length - 1}
                canRemove={rows.length > 1}
                onChange={(next) => setRows(rows.map((r, j) => (j === i ? next : r)))}
                onRemove={() => setRows(withLastHundred(rows.filter((_, j) => j !== i)))}
              />
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={rows.length >= MAX_ROWS || secondLast >= 99} onClick={() => setRows([...rows.slice(0, -1), { max: Math.min(99, secondLast + 1), effects: [] }, rows[rows.length - 1]])}>
              <Plus className="mr-1 size-4" />
              {t("addRow")}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setRows(null)}>
              {t("reset")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-hud-muted">{t("defaultHint")}</p>
          <DefaultRows slot={slot} />
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={customize}>
            {t("customize")}
          </Button>
        </>
      )}
    </RulesSection>
  );
}
