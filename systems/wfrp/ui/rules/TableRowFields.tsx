'use client';

import { Plus, X } from 'lucide-react';

import { EffectFields, effectsMax, newEffect } from './TableEffectFields';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    SLOT_EFFECTS,
    type TableRow,
    type TableSlot,
} from '@/systems/wfrp/rules/tables/schema';

export function RowFields({
    slot,
    row,
    position,
    canRemove,
    onChange,
    onRemove,
}: {
    slot: TableSlot;
    row: TableRow;
    position: { index: number; from: number; isLast: boolean };
    canRemove: boolean;
    onChange: (next: TableRow) => void;
    onRemove: () => void;
}) {
    const t = useTranslator('wfrpTables');

    const { index, from, isLast } = position;

    return (
        <li className="border-hud-border space-y-2 rounded border p-2">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <span className="text-sm text-hud-muted">
                    {t('from', { n: from })}
                </span>
                <BoundedNumberInput
                    className="min-h-11"
                    aria-label={t('upTo', { n: index + 1 })}
                    min={from}
                    max={100}
                    value={row.max}
                    disabled={isLast}
                    onCommit={(max) => onChange({ ...row, max })}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    disabled={!canRemove}
                    aria-label={t('removeRow', { n: index + 1 })}
                    onClick={onRemove}
                >
                    <X className="size-4" />
                </Button>
            </div>
            <Input
                className="min-h-11"
                aria-label={t('text', { n: index + 1 })}
                maxLength={200}
                value={row.text ?? ''}
                onChange={(e) => onChange({ ...row, text: e.target.value })}
            />
            <ul className="space-y-1">
                {row.effects.map((effect, i) => (
                    <EffectFields
                        key={i}
                        slot={slot}
                        effect={effect}
                        onChange={(next) =>
                            onChange({
                                ...row,
                                effects: row.effects.map((x, j) =>
                                    j === i ? next : x
                                ),
                            })
                        }
                        onRemove={() =>
                            onChange({
                                ...row,
                                effects: row.effects.filter((_, j) => j !== i),
                            })
                        }
                    />
                ))}
            </ul>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                disabled={row.effects.length >= effectsMax(slot)}
                onClick={() =>
                    onChange({
                        ...row,
                        effects: [
                            ...row.effects,
                            newEffect(SLOT_EFFECTS[slot][0]),
                        ],
                    })
                }
            >
                <Plus className="mr-1 size-4" />
                {t('addEffect')}
            </Button>
        </li>
    );
}
