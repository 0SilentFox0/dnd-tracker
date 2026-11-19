'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { RowFields } from './TableRowFields';

import { RulesSection } from '@/components/rules/RulesSection';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import type { RulesFormState } from '@/lib/hooks/campaigns';
import { useTranslator } from '@/lib/i18n/use-translator';
import { DEFAULT_TABLES } from '@/systems/wfrp/rules/tables/defaults';
import {
    TABLE_SLOTS,
    type TableEffect,
    type TableRow,
    type TableSlot,
} from '@/systems/wfrp/rules/tables/schema';

const MAX_ROWS = 20;

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

const withLastHundred = (rows: TableRow[]) =>
    rows.map((r, i) =>
        i === rows.length - 1 && r.max < 100 ? { ...r, max: 100 } : r
    );

function DefaultRows({ slot }: { slot: TableSlot }) {
    const t = useTranslator('wfrpTables');

    const tt = useTranslator();

    const effectText = (e: TableEffect) => {
        if (e.type === 'condition')
            return `${tt(`battleWfrp.conditions.${e.key}.label`)} ${e.levels}`;

        if (e.type === 'marker') return t(`markers.${e.key}`);

        if (e.type === 'death') return t('effect.death');

        if (e.type === 'characteristic')
            return `${tt(`gameTerms.characteristics.${e.key}.short`)} ${signed(e.amount)}`;

        if (e.type === 'move' || e.type === 'maxWounds')
            return `${t(`effect.${e.type}`)} ${signed(e.amount)}`;

        return `${t(`effect.${e.type}`)} ${e.amount}`;
    };

    return (
        <ul className="space-y-1 text-sm">
            {DEFAULT_TABLES[slot].map((row, i, rows) => (
                <li
                    key={row.max}
                    className="border-hud-border rounded border p-2"
                >
                    <span className="text-hud-muted">{`${i === 0 ? 1 : rows[i - 1].max + 1}-${row.max}`}</span>{' '}
                    {row.textKey ? tt(row.textKey) : row.text}
                    <div className="text-xs text-hud-muted">
                        {row.effects.map(effectText).join(', ')}
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function TablesSection({ form }: { form: RulesFormState }) {
    const t = useTranslator('wfrpTables');

    const tt = useTranslator();

    const [slot, setSlot] = useState<TableSlot>(TABLE_SLOTS[0]);

    const tables = form.data.tables;

    const rows = tables[slot];

    const setRows = (next: TableRow[] | null) =>
        form.set('tables', { ...tables, [slot]: next });

    const customize = () =>
        setRows(
            DEFAULT_TABLES[slot].map(({ textKey, ...row }) => {
                const translated = textKey ? tt(textKey) : row.text;

                return translated && translated !== textKey
                    ? { ...row, text: translated }
                    : row;
            })
        );

    const secondLast = rows && rows.length > 1 ? rows[rows.length - 2].max : 0;

    return (
        <RulesSection mechanic="tables">
            <SelectField
                aria-label={t('slot')}
                value={slot}
                options={TABLE_SLOTS.map((s) => ({
                    value: s,
                    label: t(`slots.${s}`),
                }))}
                onValueChange={(s) => setSlot(s as TableSlot)}
                triggerClassName="min-h-11"
            />
            {rows ? (
                <>
                    <p className="text-xs text-hud-muted">{t('customHint')}</p>
                    <ul className="space-y-2">
                        {rows.map((row, i) => (
                            <RowFields
                                key={i}
                                slot={slot}
                                row={row}
                                position={{
                                    index: i,
                                    from: i === 0 ? 1 : rows[i - 1].max + 1,
                                    isLast: i === rows.length - 1,
                                }}
                                canRemove={rows.length > 1}
                                onChange={(next) =>
                                    setRows(
                                        rows.map((r, j) => (j === i ? next : r))
                                    )
                                }
                                onRemove={() =>
                                    setRows(
                                        withLastHundred(
                                            rows.filter((_, j) => j !== i)
                                        )
                                    )
                                }
                            />
                        ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            disabled={
                                rows.length >= MAX_ROWS || secondLast >= 99
                            }
                            onClick={() =>
                                setRows([
                                    ...rows.slice(0, -1),
                                    {
                                        max: Math.min(99, secondLast + 1),
                                        effects: [],
                                    },
                                    rows[rows.length - 1],
                                ])
                            }
                        >
                            <Plus className="mr-1 size-4" />
                            {t('addRow')}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-11"
                            onClick={() => setRows(null)}
                        >
                            {t('reset')}
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-xs text-hud-muted">{t('defaultHint')}</p>
                    <DefaultRows slot={slot} />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11"
                        onClick={customize}
                    >
                        {t('customize')}
                    </Button>
                </>
            )}
        </RulesSection>
    );
}
