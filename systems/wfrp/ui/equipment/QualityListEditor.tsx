'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { NumberField } from './NumberField';

import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import {
    WFRP_CONDITION_KEYS,
    type WfrpConditionKey,
} from '@/systems/wfrp/constants/conditions';
import {
    QUALITY_KEYS,
    QUALITY_REGISTRY,
    QUALITY_VALUE_MAX,
    type QualityKey,
    type QualityRef,
} from '@/systems/wfrp/rules/equipment';

interface QualityListEditorProps {
    id: string;
    label: string;
    kind: 'quality' | 'flaw';
    also?: readonly QualityKey[];
    value: QualityRef[];
    onChange: (value: QualityRef[]) => void;
}

export function QualityListEditor({
    id,
    label,
    kind,
    also,
    value,
    onChange,
}: QualityListEditorProps) {
    const t = useTranslations('wfrpEquipmentEditor.editor');

    const tq = useTranslations('wfrpEquipment.qualities');

    const tc = useTranslations('battleWfrp.conditions');

    const conditionOptions = WFRP_CONDITION_KEYS.map((k) => ({
        value: k,
        label: tc(`${k}.label`),
    }));

    const [pick, setPick] = useState('');

    const options = QUALITY_KEYS.filter(
        (k) =>
            (QUALITY_REGISTRY[k].kind === kind || also?.includes(k)) &&
            QUALITY_REGISTRY[k].canon !== false &&
            !value.some((r) => r.key === k)
    ).map((k) => ({ value: k, label: tq(k) }));

    const add = () => {
        if (!pick) return;

        const key = pick as QualityKey;

        onChange([
            ...value,
            {
                key,
                ...(QUALITY_REGISTRY[key].hasValue && { value: 1 }),
                ...(key === 'inflict' && {
                    condition: WFRP_CONDITION_KEYS[0],
                }),
            },
        ]);
        setPick('');
    };

    const setValue = (index: number, next: number | undefined) =>
        onChange(
            value.map((r, i) =>
                i === index
                    ? {
                          key: r.key,
                          ...(r.condition && { condition: r.condition }),
                          ...(next !== undefined && { value: next }),
                      }
                    : r
            )
        );

    return (
        <section className="space-y-2" aria-label={label}>
            <h4 className="text-sm font-semibold">{label}</h4>
            {value.length > 0 && (
                <ul className="grid gap-2">
                    {value.map((r, i) => (
                        <li
                            key={r.key}
                            className="flex min-h-11 items-end gap-2"
                        >
                            <span className="min-w-0 flex-1 self-center text-sm">
                                {tq(r.key)}
                            </span>
                            {r.condition && (
                                <div className="w-32">
                                    <SelectField
                                        id={`${id}-${r.key}-condition`}
                                        value={r.condition}
                                        onValueChange={(c) =>
                                            onChange(
                                                value.map((x, j) =>
                                                    j === i
                                                        ? {
                                                              ...x,
                                                              condition:
                                                                  c as WfrpConditionKey,
                                                          }
                                                        : x
                                                )
                                            )
                                        }
                                        options={conditionOptions}
                                        triggerClassName="min-h-11 w-full"
                                    />
                                </div>
                            )}
                            {QUALITY_REGISTRY[r.key].hasValue && (
                                <div className="w-24">
                                    <NumberField
                                        id={`${id}-${r.key}`}
                                        label={t('qualityValue')}
                                        value={r.value}
                                        min={1}
                                        max={QUALITY_VALUE_MAX}
                                        onChange={(n) => setValue(i, n)}
                                    />
                                </div>
                            )}
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-11"
                                aria-label={t('removeQuality', {
                                    name: tq(r.key),
                                })}
                                onClick={() =>
                                    onChange(value.filter((_, j) => j !== i))
                                }
                            >
                                ×
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                    <SelectField
                        id={`${id}-pick`}
                        value={pick}
                        onValueChange={setPick}
                        placeholder={t('pickQuality')}
                        options={options}
                        triggerClassName="min-h-11 w-full"
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={add}
                    disabled={!pick}
                >
                    {t('addQuality')}
                </Button>
            </div>
        </section>
    );
}
