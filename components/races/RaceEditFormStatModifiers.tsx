'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ABILITY_SCORES, abilityScoreTermKey } from '@/lib/constants/abilities';
import type { RaceFormData, StatModifier } from '@/types/races';

interface RaceEditFormStatModifiersProps {
    formData: RaceFormData;
    setFormData: React.Dispatch<React.SetStateAction<RaceFormData>>;
}

const MODIFIER_FIELDS = [
    { field: 'bonus', id: 'bonus', label: 'form.statModifiers.bonus' },
    {
        field: 'nonNegative',
        id: 'non-negative',
        label: 'form.statModifiers.nonNegative',
    },
    {
        field: 'alwaysZero',
        id: 'always-zero',
        label: 'form.statModifiers.alwaysZero',
    },
] as const;

function toggled(
    modifiers: StatModifier,
    field: keyof StatModifier,
    on: boolean
): StatModifier {
    if (field === 'alwaysZero') {
        return {
            bonus: on ? false : modifiers.bonus,
            nonNegative: on ? false : modifiers.nonNegative,
            alwaysZero: on,
        };
    }

    return {
        ...modifiers,
        [field]: on,
        alwaysZero: on ? false : modifiers.alwaysZero,
    };
}

export function RaceEditFormStatModifiers({
    formData,
    setFormData,
}: RaceEditFormStatModifiersProps) {
    const t = useTranslations('races');

    const tg = useTranslations('gameTerms');

    const setModifier = (key: string, next: StatModifier) =>
        setFormData((prev) => ({
            ...prev,
            passiveAbility: {
                ...prev.passiveAbility,
                description: prev.passiveAbility?.description || '',
                statImprovements: prev.passiveAbility?.statImprovements || '',
                statModifiers: {
                    ...prev.passiveAbility?.statModifiers,
                    [key]: next,
                },
            },
        }));

    return (
        <div className="max-h-96 space-y-4 overflow-y-auto rounded-md border p-3">
            {ABILITY_SCORES.map((ability) => {
                const modifiers: StatModifier =
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
                            {MODIFIER_FIELDS.map(({ field, id, label }) => (
                                <div
                                    key={field}
                                    className="flex items-center space-x-2"
                                >
                                    <Checkbox
                                        id={`${ability.key}-${id}`}
                                        checked={modifiers[field] || false}
                                        onCheckedChange={(checked) =>
                                            setModifier(
                                                ability.key,
                                                toggled(
                                                    modifiers,
                                                    field,
                                                    checked === true
                                                )
                                            )
                                        }
                                    />
                                    <Label
                                        htmlFor={`${ability.key}-${id}`}
                                        className="cursor-pointer text-sm font-normal"
                                    >
                                        {t(label)}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
