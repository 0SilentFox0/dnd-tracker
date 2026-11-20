'use client';

import { X } from 'lucide-react';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { useTranslator } from '@/lib/i18n/use-translator';
import { CHARACTERISTIC_KEYS } from '@/systems/wfrp/constants/characteristics';
import {
    WFRP_CONDITION_KEYS,
    WFRP_CONDITION_MAX_LEVEL,
} from '@/systems/wfrp/constants/conditions';
import {
    MUTATION_EFFECT_LIMITS,
    MUTATION_EFFECTS_MAX,
} from '@/systems/wfrp/constants/mutations';
import {
    FUMBLE_KINDS,
    MARKER_KEYS,
    MUTATION_SLOTS,
    SLOT_EFFECTS,
    type TableEffect,
    type TableSlot,
} from '@/systems/wfrp/rules/tables/schema';

const MAX_EFFECTS = 4;

export const effectsMax = (slot: TableSlot) =>
    (MUTATION_SLOTS as readonly string[]).includes(slot)
        ? MUTATION_EFFECTS_MAX
        : MAX_EFFECTS;

export const newEffect = (type: TableEffect['type']): TableEffect => {
    if (type === 'condition')
        return { type, key: WFRP_CONDITION_KEYS[0], levels: 1 };

    if (type === 'marker') return { type, key: MARKER_KEYS[0] };

    if (type === 'death') return { type };

    if (type === 'fumble') return { type, kind: FUMBLE_KINDS[0] };

    if (type === 'characteristic')
        return { type, key: CHARACTERISTIC_KEYS[0], amount: -5 };

    if (type === 'move' || type === 'maxWounds') return { type, amount: -1 };

    return { type, amount: 1 };
};

const nonZero = (n: number, prev: number) => n || (prev < 0 ? -1 : 1);

export function EffectFields({
    slot,
    effect,
    onChange,
    onRemove,
}: {
    slot: TableSlot;
    effect: TableEffect;
    onChange: (next: TableEffect) => void;
    onRemove: () => void;
}) {
    const t = useTranslator('wfrpTables');

    const tt = useTranslator();

    return (
        <li className="flex flex-wrap items-center gap-2">
            <SelectField
                aria-label={t('effectType')}
                value={effect.type}
                options={SLOT_EFFECTS[slot].map((type) => ({
                    value: type,
                    label: t(`effect.${type}`),
                }))}
                onValueChange={(type) =>
                    onChange(newEffect(type as TableEffect['type']))
                }
                triggerClassName="min-h-11 w-40"
            />
            {(effect.type === 'damage' || effect.type === 'wounds') && (
                <BoundedNumberInput
                    className="min-h-11 w-20"
                    aria-label={t('amount')}
                    min={1}
                    max={20}
                    value={effect.amount}
                    onCommit={(amount) => onChange({ ...effect, amount })}
                />
            )}
            {effect.type === 'condition' && (
                <>
                    <SelectField
                        aria-label={t('condition')}
                        value={effect.key}
                        options={WFRP_CONDITION_KEYS.map((key) => ({
                            value: key,
                            label: tt(`battleWfrp.conditions.${key}.label`),
                        }))}
                        onValueChange={(key) =>
                            onChange({
                                ...effect,
                                key: key as typeof effect.key,
                            })
                        }
                        triggerClassName="min-h-11 w-40"
                    />
                    <BoundedNumberInput
                        className="min-h-11 w-20"
                        aria-label={t('levels')}
                        min={1}
                        max={WFRP_CONDITION_MAX_LEVEL}
                        value={effect.levels}
                        onCommit={(levels) => onChange({ ...effect, levels })}
                    />
                </>
            )}
            {effect.type === 'characteristic' && (
                <>
                    <SelectField
                        aria-label={t('characteristic')}
                        value={effect.key}
                        options={CHARACTERISTIC_KEYS.map((key) => ({
                            value: key,
                            label: tt(`gameTerms.characteristics.${key}.short`),
                        }))}
                        onValueChange={(key) =>
                            onChange({
                                ...effect,
                                key: key as typeof effect.key,
                            })
                        }
                        triggerClassName="min-h-11 w-40"
                    />
                    <BoundedNumberInput
                        className="min-h-11 w-20"
                        aria-label={t('amount')}
                        min={-MUTATION_EFFECT_LIMITS.characteristic}
                        max={MUTATION_EFFECT_LIMITS.characteristic}
                        value={effect.amount}
                        onCommit={(amount) =>
                            onChange({
                                ...effect,
                                amount: nonZero(amount, effect.amount),
                            })
                        }
                    />
                </>
            )}
            {(effect.type === 'move' || effect.type === 'maxWounds') && (
                <BoundedNumberInput
                    className="min-h-11 w-20"
                    aria-label={t('amount')}
                    min={-MUTATION_EFFECT_LIMITS[effect.type]}
                    max={MUTATION_EFFECT_LIMITS[effect.type]}
                    value={effect.amount}
                    onCommit={(amount) =>
                        onChange({
                            ...effect,
                            amount: nonZero(amount, effect.amount),
                        })
                    }
                />
            )}
            {effect.type === 'fumble' && (
                <SelectField
                    aria-label={t('effect.fumble')}
                    value={effect.kind}
                    options={FUMBLE_KINDS.map((kind) => ({
                        value: kind,
                        label: t(`fumbleKinds.${kind}`),
                    }))}
                    onValueChange={(kind) =>
                        onChange({
                            ...effect,
                            kind: kind as typeof effect.kind,
                        })
                    }
                    triggerClassName="min-h-11 w-48"
                />
            )}
            {effect.type === 'marker' && (
                <SelectField
                    aria-label={t('marker')}
                    value={effect.key}
                    options={MARKER_KEYS.map((key) => ({
                        value: key,
                        label: t(`markers.${key}`),
                    }))}
                    onValueChange={(key) =>
                        onChange({ ...effect, key: key as typeof effect.key })
                    }
                    triggerClassName="min-h-11 w-40"
                />
            )}
            {effect.type === 'marker' && (
                <Input
                    type="number"
                    className="min-h-11 w-20"
                    aria-label={t('rounds')}
                    min={1}
                    max={20}
                    value={effect.rounds ?? ''}
                    onChange={(e) => {
                        const { rounds: _drop, ...rest } = effect;

                        const n = Math.trunc(Number(e.target.value));

                        onChange(
                            e.target.value === '' || !Number.isFinite(n)
                                ? rest
                                : {
                                      ...rest,
                                      rounds: Math.max(1, Math.min(20, n)),
                                  }
                        );
                    }}
                />
            )}
            {effect.type === 'marker' && (
                <Input
                    className="min-h-11 w-28"
                    aria-label={t('roundsFormula')}
                    placeholder="1d10 - TB"
                    maxLength={20}
                    value={effect.roundsFormula ?? ''}
                    onChange={(e) => {
                        const { roundsFormula: _drop, ...rest } = effect;

                        onChange(
                            e.target.value === ''
                                ? rest
                                : { ...rest, roundsFormula: e.target.value }
                        );
                    }}
                />
            )}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label={t('removeEffect')}
                onClick={onRemove}
            >
                <X className="size-4" />
            </Button>
        </li>
    );
}
