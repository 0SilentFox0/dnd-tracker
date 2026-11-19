'use client';

import { useTranslations } from 'next-intl';

import { HUD_SELECT_TRIGGER_CLASS } from '@/components/hud/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { ABILITY_KEYS, type AbilityKey } from '@/lib/constants/abilities';
import { CHOICE_LIMITS } from '@/lib/constants/choices';
import { MAX_SPELL_LEVEL } from '@/lib/constants/spells';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { SpellGrantPolicy } from '@/types/choices';

export function SpellGrantEditor({
    value,
    onChange,
}: {
    value?: SpellGrantPolicy;
    onChange: (next: SpellGrantPolicy | undefined) => void;
}) {
    const t = useTranslations('choices');

    const tg = useTranslator('gameTerms');

    const set = (patch: Partial<SpellGrantPolicy>) =>
        value && onChange({ ...value, ...patch });

    return (
        <fieldset className="space-y-2 rounded border border-hud-line p-2">
            <label className="flex items-center gap-2 text-sm">
                <Checkbox
                    checked={!!value}
                    onCheckedChange={(v) =>
                        onChange(
                            v === true
                                ? { uses: 1, rest: 'long', via: 'grant' }
                                : undefined
                        )
                    }
                />
                {t('grant.freeCast')}
            </label>
            {value && (
                <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs">
                        {t('grant.uses')}
                        <Input
                            aria-label={t('grant.usesAria')}
                            type="number"
                            min={1}
                            max={CHOICE_LIMITS.grantUses}
                            disabled={value.uses === 'proficiency'}
                            value={
                                value.uses === 'proficiency' ? '' : value.uses
                            }
                            onChange={(e) =>
                                set({ uses: Number(e.target.value) || 1 })
                            }
                        />
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                            checked={value.uses === 'proficiency'}
                            onCheckedChange={(v) =>
                                set({
                                    uses: v === true ? 'proficiency' : 1,
                                })
                            }
                        />
                        {t('grant.proficiency')}
                    </label>
                    <label className="text-xs">
                        {t('grant.rest')}
                        <SelectField
                            aria-label={t('grant.restAria')}
                            triggerClassName={`${HUD_SELECT_TRIGGER_CLASS} w-auto`}
                            value={value.rest}
                            onValueChange={(rest) =>
                                set({ rest: rest as 'short' | 'long' })
                            }
                            options={[
                                { value: 'long', label: t('grant.restLong') },
                                { value: 'short', label: t('grant.restShort') },
                            ]}
                        />
                    </label>
                    <label className="text-xs">
                        {t('grant.circle')}
                        <Input
                            aria-label={t('grant.circleAria')}
                            type="number"
                            min={0}
                            max={MAX_SPELL_LEVEL}
                            value={value.castLevel ?? ''}
                            onChange={(e) =>
                                set({
                                    castLevel:
                                        e.target.value === ''
                                            ? undefined
                                            : Number(e.target.value),
                                })
                            }
                        />
                    </label>
                    <label className="text-xs">
                        {t('grant.ability')}
                        <SelectField
                            aria-label={t('grant.abilityAria')}
                            triggerClassName={`${HUD_SELECT_TRIGGER_CLASS} w-auto`}
                            value={value.dcAbility ?? ''}
                            onValueChange={(ability) =>
                                set({
                                    dcAbility: (ability || undefined) as
                                        | AbilityKey
                                        | undefined,
                                })
                            }
                            allowNone
                            noneLabel={t('grant.abilityDefault')}
                            options={ABILITY_KEYS.map((key) => ({
                                value: key,
                                label: tg(`abilities.${key}.label`),
                            }))}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                            checked={value.via === 'slotOrGrant'}
                            onCheckedChange={(v) =>
                                set({
                                    via: v === true ? 'slotOrGrant' : 'grant',
                                })
                            }
                        />
                        {t('grant.viaSlots')}
                    </label>
                    <label className="text-xs sm:col-span-2">
                        {t('grant.sharedPool')}
                        <Input
                            aria-label={t('grant.sharedPoolAria')}
                            value={value.sharedPool ?? ''}
                            onChange={(e) =>
                                set({ sharedPool: e.target.value || undefined })
                            }
                        />
                    </label>
                </div>
            )}
        </fieldset>
    );
}
