'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { useMainSkills, usePersonalSkills } from '@/lib/hooks/skills';
import type { CharacterFormBindings } from '@/lib/utils/characters/form/bindings';

interface CharacterAbilitiesSectionProps {
    campaignId: string;
    abilities: CharacterFormBindings['abilities'];
}

export function CharacterAbilitiesSection({
    campaignId,
    abilities,
}: CharacterAbilitiesSectionProps) {
    const t = useTranslations('characters.form.personalAbility');

    const { data: mainSkills = [] } = useMainSkills(campaignId);

    const personalMainSkillId = mainSkills.find(
        (ms) => ms.role === 'personal'
    )?.id;

    const { data: personalSkills = [] } = usePersonalSkills(
        campaignId,
        personalMainSkillId
    );

    const options = useMemo(
        () => personalSkills.map((s) => ({ value: s.id, label: s.name })),
        [personalSkills]
    );

    return (
        <div className="w-full space-y-4">
            <div className="w-full min-w-0">
                <Label htmlFor="personalSkillId">{t('label')}</Label>
                <SelectField
                    id="personalSkillId"
                    value={abilities.data.personalSkillId}
                    onValueChange={(value) =>
                        abilities.set('personalSkillId', value)
                    }
                    options={options}
                    placeholder={t('placeholder')}
                    triggerClassName="w-full mt-1"
                    allowNone
                    noneLabel={t('none')}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                    {t('hint')}
                </p>
            </div>
        </div>
    );
}
