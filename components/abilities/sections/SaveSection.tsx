'use client';

import { useTranslations } from 'next-intl';

import type { AbilitySectionProps } from '../editor/AbilityPanel';
import { useErrorsUnder } from '../editor/editor-context';
import { FieldErrors } from '../editor/FieldErrors';
import { SectionTitle } from './SectionTitle';

import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { ABILITY_KEYS, type AbilityKey } from '@/lib/constants/abilities';

const DEFAULT_DC = 13;

export function SaveSection({
    ability,
    path,
    onChange,
}: Omit<AbilitySectionProps, 'state'>) {
    const t = useTranslations('abilities.save');

    const tg = useTranslations('gameTerms.abilities');

    const errors = useErrorsUnder(`${path}.save`);

    if (ability.trigger.event === 'passive') return null;

    const current = ability.save;

    const setSave = (save: { ability: AbilityKey; dc: number } | undefined) => {
        const { save: _s, ...rest } = ability;

        onChange(save ? { ...rest, save } : rest);
    };

    return (
        <div className="space-y-2">
            <SectionTitle>{t('title')}</SectionTitle>
            <div className="flex items-center gap-2">
                <SelectField
                    aria-label={t('abilityAria')}
                    triggerClassName="h-9 w-auto rounded-md border border-hud-line bg-hud-field px-2 text-sm"
                    value={ability.save?.ability ?? ''}
                    onValueChange={(key) =>
                        setSave(
                            key
                                ? {
                                      ability: key as AbilityKey,
                                      dc: ability.save?.dc ?? DEFAULT_DC,
                                  }
                                : undefined
                        )
                    }
                    allowNone
                    noneLabel={t('none')}
                    options={ABILITY_KEYS.map((key) => ({
                        value: key,
                        label: tg(`${key}.label`),
                    }))}
                />
                {current && (
                    <Input
                        type="number"
                        min={1}
                        max={30}
                        className="w-20"
                        aria-label={t('dcAria')}
                        value={current.dc}
                        onChange={(e) =>
                            setSave({
                                ability: current.ability,
                                dc: Number(e.target.value) || DEFAULT_DC,
                            })
                        }
                    />
                )}
            </div>
            <p className="text-xs text-muted-foreground">{t('hint')}</p>
            <FieldErrors errors={errors} />
        </div>
    );
}
