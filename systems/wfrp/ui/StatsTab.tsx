'use client';

import { useTranslations } from 'next-intl';

import { CorruptionBlock } from './corruption/CorruptionBlock';
import { CharacteristicsGrid } from './CharacteristicsGrid';
import { SkillsList } from './SkillsList';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { HudSection } from '@/components/hud/form';
import type { StatsTabProps } from '@/components/systems/types';
import { SHEET_SLOT } from '@/systems/wfrp/rules/slots';

export function StatsTab({ section, onRoll, canRoll }: StatsTabProps) {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.wfrp');

    const block = SHEET_SLOT.read(sheet.systemSlot);

    if (!block) return null;

    return section === 'top' ? (
        <>
            <HudSection title={t('characteristics')}>
                <CharacteristicsGrid
                    block={block}
                    onRoll={onRoll}
                    canRoll={canRoll}
                />
            </HudSection>
            <CorruptionBlock />
        </>
    ) : (
        <HudSection title={t('skills')}>
            <SkillsList block={block} onRoll={onRoll} canRoll={canRoll} />
        </HudSection>
    );
}
