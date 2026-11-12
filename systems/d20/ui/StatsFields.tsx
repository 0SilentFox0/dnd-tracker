'use client';

import { useTranslations } from 'next-intl';

import { CharacterAbilityScores } from '@/components/characters/stats/CharacterAbilityScores';
import { CharacterCombatParams } from '@/components/characters/stats/CharacterCombatParams';
import { HudSection } from '@/components/hud/form';
import type { StatsFieldsProps } from '@/components/systems/types';

export function StatsFields({
    bindings: { abilityScores, combatStats },
    campaignId,
    mode,
    classArmor,
    extraFields,
}: StatsFieldsProps) {
    const t = useTranslations('characters');

    if (mode === 'edit') {
        return (
            <>
                <CharacterAbilityScores
                    abilityScores={abilityScores}
                    withPrimary
                />
                <CharacterCombatParams
                    campaignId={campaignId}
                    combatStats={combatStats}
                    classArmor={classArmor}
                    extraFields={extraFields}
                />
            </>
        );
    }

    return (
        <>
            <HudSection title={t('form.sections.abilityScores')}>
                <CharacterAbilityScores abilityScores={abilityScores} />
            </HudSection>
            <HudSection title={t('form.sections.combatParams')}>
                <CharacterCombatParams
                    campaignId={campaignId}
                    combatStats={combatStats}
                    classArmor={classArmor}
                    extraFields={extraFields}
                />
            </HudSection>
        </>
    );
}
