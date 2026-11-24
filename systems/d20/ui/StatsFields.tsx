'use client';

import { useTranslations } from 'next-intl';

import { HudSection } from '@/components/hud/form';
import type { StatsFieldsProps } from '@/components/systems/types';
import { CharacterAbilityScores } from '@/systems/d20/ui/stats/CharacterAbilityScores';
import { CharacterCombatParams } from '@/systems/d20/ui/stats/CharacterCombatParams';

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
            <div className="space-y-5">
                <HudSection panel title={t('form.sections.abilityScores')}>
                    <CharacterAbilityScores
                        abilityScores={abilityScores}
                        withPrimary
                    />
                </HudSection>
                <HudSection panel title={t('form.sections.combatParams')}>
                    <CharacterCombatParams
                        campaignId={campaignId}
                        combatStats={combatStats}
                        classArmor={classArmor}
                        extraFields={extraFields}
                    />
                </HudSection>
            </div>
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
