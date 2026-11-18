'use client';

import type { ReactNode } from 'react';

import {
    resolutionKeysOf,
    SPELL_SIDE_KEYS,
    TARGETING_KINDS,
    TEMPLATE_SHAPE_KEYS,
} from './spell-form-defaults';
import { SpellRangeInput } from './SpellRangeInput';
import { SpellResolutionFields } from './SpellResolutionFields';
import { RANGED_KINDS, targetingOf } from './targeting-of';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { Switch } from '@/components/ui/switch';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { TemplateShape } from '@/types/battle-grid';
import type { SpellResolution, SpellTargeting } from '@/types/spells';

export { targetingOf };

export interface TargetingValue {
    targeting: SpellTargeting;
    resolution: SpellResolution;
}

interface SpellTargetingFieldsProps {
    value: TargetingValue;
    onChange: (value: TargetingValue) => void;
    classesEnabled?: boolean;
    magic?: boolean;
    idPrefix?: string;
    children?: ReactNode;
}

/** `children` render between the targeting block and the check (the template zone switch lives there). */
export function SpellTargetingFields({
    value,
    onChange,
    classesEnabled = false,
    magic = false,
    idPrefix = '',
    children,
}: SpellTargetingFieldsProps) {
    const t = useTranslator();

    const { targeting, resolution } = value;

    const id = (name: string) => (idPrefix ? `${idPrefix}.${name}` : name);

    const tp = (key: string, values?: Record<string, string | number>) =>
        t(`spellEditor.power.${key}`, values);

    const options = (keys: string[], prefix: string) =>
        keys.map((k) => ({ value: k, label: t(`${prefix}.${k}`) }));

    const resolutionOptions = options(
        resolutionKeysOf(magic),
        'spellEditor.power.resolution'
    );

    return (
        <>
            <div className="col-span-2">
                <Label htmlFor={id('targeting')}>{tp('targets')}</Label>
                <SelectField
                    id={id('targeting')}
                    value={targeting.kind}
                    onValueChange={(kind) =>
                        onChange({
                            ...value,
                            targeting: targetingOf(
                                kind,
                                targeting,
                                classesEnabled
                            ),
                        })
                    }
                    placeholder={tp('targets')}
                    options={options(TARGETING_KINDS, 'spells.targeting')}
                />
            </div>
            {targeting.kind === 'template' && (
                <>
                    <div>
                        <Label htmlFor={id('template-shape')}>
                            {tp('shape')}
                        </Label>
                        <SelectField
                            id={id('template-shape')}
                            value={targeting.shape}
                            onValueChange={(shape) =>
                                onChange({
                                    ...value,
                                    targeting: {
                                        ...targeting,
                                        shape: shape as TemplateShape,
                                        hollow:
                                            shape === 'circle'
                                                ? targeting.hollow
                                                : undefined,
                                        exact:
                                            shape === 'circle'
                                                ? (targeting.exact ??
                                                  (classesEnabled || undefined))
                                                : undefined,
                                        ...(shape === 'emanation' && {
                                            range: undefined,
                                        }),
                                    },
                                })
                            }
                            placeholder={tp('shape')}
                            options={options(
                                TEMPLATE_SHAPE_KEYS,
                                'spells.shapes'
                            )}
                        />
                    </div>
                    <div>
                        <Label htmlFor={id('template-size')}>
                            {tp('size')}
                        </Label>
                        <BoundedNumberInput
                            id={id('template-size')}
                            min={5}
                            max={120}
                            value={targeting.size}
                            onCommit={(v) =>
                                onChange({
                                    ...value,
                                    targeting: { ...targeting, size: v },
                                })
                            }
                            className="w-24"
                        />
                    </div>
                </>
            )}
            {targeting.kind === 'template' && targeting.shape === 'circle' && (
                <div className="col-span-2 flex items-center gap-2">
                    <Switch
                        id={id('template-exact')}
                        checked={!!targeting.exact}
                        onCheckedChange={(on) =>
                            onChange({
                                ...value,
                                targeting: {
                                    ...targeting,
                                    exact: on || undefined,
                                },
                            })
                        }
                    />
                    <Label htmlFor={id('template-exact')}>{tp('exact')}</Label>
                </div>
            )}
            {targeting.kind === 'template' && targeting.shape === 'circle' && (
                <div className="col-span-2 flex items-center gap-2">
                    <Switch
                        id={id('template-hollow')}
                        checked={!!targeting.hollow}
                        onCheckedChange={(on) =>
                            onChange({
                                ...value,
                                targeting: {
                                    ...targeting,
                                    hollow: on || undefined,
                                },
                            })
                        }
                    />
                    <Label htmlFor={id('template-hollow')}>
                        {tp('hollow')}
                    </Label>
                </div>
            )}
            {(targeting.kind === 'area' || targeting.kind === 'template') && (
                <>
                    <div>
                        <Label htmlFor={id('targeting-side')}>
                            {tp(
                                targeting.kind === 'template'
                                    ? 'sideNoMap'
                                    : 'side'
                            )}
                        </Label>
                        <SelectField
                            id={id('targeting-side')}
                            value={targeting.side}
                            onValueChange={(side) =>
                                onChange({
                                    ...value,
                                    targeting: {
                                        ...targeting,
                                        side: side as 'ally' | 'enemy',
                                    },
                                })
                            }
                            placeholder={tp('side')}
                            options={options(
                                SPELL_SIDE_KEYS,
                                'spellEditor.power.sides'
                            )}
                        />
                    </div>
                    <div>
                        <Label htmlFor={id('targeting-max')}>
                            {tp(
                                targeting.kind === 'template'
                                    ? 'maxTargetsNoMap'
                                    : 'maxTargets'
                            )}
                        </Label>
                        <BoundedNumberInput
                            id={id('targeting-max')}
                            min={1}
                            max={20}
                            value={targeting.maxTargets}
                            onCommit={(v) =>
                                onChange({
                                    ...value,
                                    targeting: { ...targeting, maxTargets: v },
                                })
                            }
                            className="w-24"
                        />
                    </div>
                </>
            )}
            {targeting.kind === 'area' && (
                <div className="col-span-2 flex items-center gap-2">
                    <Switch
                        id={id('targeting-chain')}
                        checked={!!targeting.chain}
                        onCheckedChange={(on) =>
                            onChange({
                                ...value,
                                targeting: {
                                    ...targeting,
                                    chain: on || undefined,
                                },
                            })
                        }
                    />
                    <Label htmlFor={id('targeting-chain')}>{tp('chain')}</Label>
                </div>
            )}
            {RANGED_KINDS.includes(targeting.kind) &&
                !(
                    targeting.kind === 'template' &&
                    targeting.shape === 'emanation'
                ) && (
                    <div className="col-span-2">
                        <Label htmlFor="spell-range">{tp('range')}</Label>
                        <SpellRangeInput
                            id={id('spell-range')}
                            value={(targeting as { range?: number }).range}
                            onCommit={(range) =>
                                onChange({
                                    ...value,
                                    targeting: {
                                        ...targeting,
                                        range,
                                    } as SpellTargeting,
                                })
                            }
                        />
                    </div>
                )}
            {children}
            <SpellResolutionFields
                value={value}
                onChange={onChange}
                options={
                    classesEnabled || resolution.kind === 'attack'
                        ? resolutionOptions
                        : resolutionOptions.filter((o) => o.value !== 'attack')
                }
                id={id}
            />
        </>
    );
}
