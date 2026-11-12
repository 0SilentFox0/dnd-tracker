'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ABILITY_SCORES, abilityScoreTermKey } from '@/lib/constants/abilities';
import type { RaceFormData } from '@/types/races';

interface RaceEditFormStatModifiersProps {
    formData: RaceFormData;
    setFormData: React.Dispatch<React.SetStateAction<RaceFormData>>;
}

export function RaceEditFormStatModifiers({
    formData,
    setFormData,
}: RaceEditFormStatModifiersProps) {
    const t = useTranslations('races');

    const tg = useTranslations('gameTerms');

    return (
        <div className="max-h-96 space-y-4 overflow-y-auto rounded-md border p-3">
            {ABILITY_SCORES.map((ability) => {
                const modifiers =
                    formData.passiveAbility?.statModifiers?.[ability.key] || {};

                return (
                    <div
                        key={ability.key}
                        className="space-y-2 border-b pb-3 last:border-0"
                    >
                        <Label className="mt-2 text-sm font-semibold">
                            {tg(abilityScoreTermKey(ability.key))} (
                            {ability.abbreviation})
                        </Label>
                        <div className="space-y-2 pl-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${ability.key}-bonus`}
                                    checked={modifiers.bonus || false}
                                    onCheckedChange={(checked) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            passiveAbility: {
                                                ...prev.passiveAbility,
                                                description:
                                                    prev.passiveAbility
                                                        ?.description || '',
                                                statImprovements:
                                                    prev.passiveAbility
                                                        ?.statImprovements ||
                                                    '',
                                                statModifiers: {
                                                    ...prev.passiveAbility
                                                        ?.statModifiers,
                                                    [ability.key]: {
                                                        ...modifiers,
                                                        bonus: checked === true,
                                                        alwaysZero:
                                                            checked === true
                                                                ? false
                                                                : modifiers.alwaysZero,
                                                    },
                                                },
                                            },
                                        }));
                                    }}
                                />
                                <Label
                                    htmlFor={`${ability.key}-bonus`}
                                    className="cursor-pointer text-sm font-normal"
                                >
                                    {t('form.statModifiers.bonus')}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${ability.key}-non-negative`}
                                    checked={modifiers.nonNegative || false}
                                    onCheckedChange={(checked) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            passiveAbility: {
                                                ...prev.passiveAbility,
                                                description:
                                                    prev.passiveAbility
                                                        ?.description || '',
                                                statImprovements:
                                                    prev.passiveAbility
                                                        ?.statImprovements ||
                                                    '',
                                                statModifiers: {
                                                    ...prev.passiveAbility
                                                        ?.statModifiers,
                                                    [ability.key]: {
                                                        ...modifiers,
                                                        nonNegative:
                                                            checked === true,
                                                        alwaysZero:
                                                            checked === true
                                                                ? false
                                                                : modifiers.alwaysZero,
                                                    },
                                                },
                                            },
                                        }));
                                    }}
                                />
                                <Label
                                    htmlFor={`${ability.key}-non-negative`}
                                    className="cursor-pointer text-sm font-normal"
                                >
                                    {t('form.statModifiers.nonNegative')}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${ability.key}-always-zero`}
                                    checked={modifiers.alwaysZero || false}
                                    onCheckedChange={(checked) => {
                                        setFormData((prev) => ({
                                            ...prev,
                                            passiveAbility: {
                                                ...prev.passiveAbility,
                                                description:
                                                    prev.passiveAbility
                                                        ?.description || '',
                                                statImprovements:
                                                    prev.passiveAbility
                                                        ?.statImprovements ||
                                                    '',
                                                statModifiers: {
                                                    ...prev.passiveAbility
                                                        ?.statModifiers,
                                                    [ability.key]: {
                                                        bonus:
                                                            checked === true
                                                                ? false
                                                                : modifiers.bonus,
                                                        nonNegative:
                                                            checked === true
                                                                ? false
                                                                : modifiers.nonNegative,
                                                        alwaysZero:
                                                            checked === true,
                                                    },
                                                },
                                            },
                                        }));
                                    }}
                                />
                                <Label
                                    htmlFor={`${ability.key}-always-zero`}
                                    className="cursor-pointer text-sm font-normal"
                                >
                                    {t('form.statModifiers.alwaysZero')}
                                </Label>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
