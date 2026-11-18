'use client';

import { SAVE_ABILITY_KEYS, SAVE_ON_SUCCESS_KEYS } from './spell-form-defaults';
import type { TargetingValue } from './SpellTargetingFields';

import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import type { AbilityKey } from '@/lib/constants/abilities';
import { useTranslator } from '@/lib/i18n/use-translator';

export function SpellResolutionFields({
    value,
    onChange,
    options,
    id,
}: {
    value: TargetingValue;
    onChange: (value: TargetingValue) => void;
    options: { value: string; label: string }[];
    id: (name: string) => string;
}) {
    const t = useTranslator();

    const { resolution } = value;

    const tp = (key: string) => t(`spellEditor.power.${key}`);

    const optionsOf = (keys: string[], prefix: string) =>
        keys.map((k) => ({ value: k, label: t(`${prefix}.${k}`) }));

    return (
        <>
            <div className="col-span-2">
                <Label htmlFor={id('resolution')}>{tp('check')}</Label>
                <SelectField
                    id={id('resolution')}
                    value={resolution.kind}
                    onValueChange={(kind) =>
                        onChange({
                            ...value,
                            resolution:
                                kind === 'save'
                                    ? {
                                          kind,
                                          ability: 'dexterity',
                                          onSuccess: 'half',
                                      }
                                    : kind === 'attack'
                                      ? { kind }
                                      : { kind: 'auto' },
                        })
                    }
                    placeholder={tp('check')}
                    options={
                        classesEnabled || resolution.kind === 'attack'
                            ? options
                            : options.filter(
                                  (o) => o.value !== 'attack'
                              )
                    }
                />
            </div>
            {resolution.kind === 'save' && (
                <>
                    <div>
                        <Label htmlFor={id('save-ability')}>
                            {tp('saveAbility')}
                        </Label>
                        <SelectField
                            id={id('save-ability')}
                            value={resolution.ability}
                            onValueChange={(ability) =>
                                onChange({
                                    ...value,
                                    resolution: {
                                        ...resolution,
                                        ability: ability as AbilityKey,
                                    },
                                })
                            }
                            placeholder={tp('saveAbility')}
                            options={SAVE_ABILITY_KEYS.map((k) => ({
                                value: k,
                                label: t(`gameTerms.abilities.${k}.label`),
                            }))}
                        />
                    </div>
                    <div>
                        <Label htmlFor={id('save-on-success')}>
                            {tp('onSuccess')}
                        </Label>
                        <SelectField
                            id={id('save-on-success')}
                            value={resolution.onSuccess}
                            onValueChange={(onSuccess) =>
                                onChange({
                                    ...value,
                                    resolution: {
                                        ...resolution,
                                        onSuccess: onSuccess as 'half' | 'none',
                                    },
                                })
                            }
                            placeholder={tp('onSuccess')}
                            options={optionsOf(
                                SAVE_ON_SUCCESS_KEYS,
                                'spells.saveOnSuccess'
                            )}
                        />
                    </div>
                </>
            )}
        </>
    );
}
