'use client';

import { useTranslations } from 'next-intl';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { EntityIcon } from '@/components/common/EntityIcon';
import { ProgressionPanel } from '@/components/skill-tree/progression/ProgressionPanel';
import type { PathPanelProps } from '@/components/systems/types';

export function SkillTreePanel({ manage }: PathPanelProps) {
    const { campaignId, characterId, sheet } = useProfile();

    const t = useTranslations('characterProfile.skills');

    const personal = sheet.personalSkill;

    return (
        <>
            {personal && (
                <section className="mb-3 flex gap-3 rounded-[10px] border border-hud-gold/40 bg-hud-field p-3">
                    <EntityIcon
                        src={sheet.identity.avatar || personal.icon}
                        name={personal.name}
                        alt={sheet.identity.name}
                        size={48}
                        className="hud-sc size-12 rounded-md border border-hud-line bg-hud-raised text-inherit"
                    />
                    <div className="min-w-0">
                        <p className="text-[11px] text-hud-gold uppercase">
                            {t('personal')}
                        </p>
                        <h3 className="hud-sc text-base text-hud-ink">
                            {personal.name}
                        </h3>
                        {personal.description && (
                            <p className="mt-1 text-[13px] leading-snug text-hud-soft">
                                {personal.description}
                            </p>
                        )}
                    </div>
                </section>
            )}
            {!sheet.classProgression?.length && (
                <div className="-mx-4">
                    <ProgressionPanel
                        campaignId={campaignId}
                        characterId={characterId}
                        canManage={manage}
                    />
                </div>
            )}
        </>
    );
}
