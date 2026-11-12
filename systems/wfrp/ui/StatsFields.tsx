'use client';

import { useTranslations } from 'next-intl';

import { wfrpBinding } from './characteristics-binding';
import { CharacteristicsEditor } from './CharacteristicsEditor';
import { SkillAdvancesEditor } from './SkillAdvancesEditor';

import { HudSection } from '@/components/hud/form';
import type { StatsFieldsProps } from '@/components/systems/types';

export function StatsFields({ bindings }: StatsFieldsProps) {
    const t = useTranslations('characters.wfrp');

    const characteristics = wfrpBinding(bindings.characteristics);

    return (
        <>
            <HudSection title={t('characteristics')}>
                <CharacteristicsEditor binding={characteristics} />
            </HudSection>
            <HudSection title={t('skills')}>
                <SkillAdvancesEditor binding={characteristics} />
            </HudSection>
        </>
    );
}
