'use client';

import { useTranslations } from 'next-intl';

import { Section } from '@/components/battle/participants/Section';
import type { ParticipantStatsProps } from '@/components/systems/types';
import { useBattleSceneData } from '@/lib/hooks/battle';
import { getEffectiveArmorClass } from '@/lib/utils/battle/participant/helpers';
import {
    formatKnownArmorClass,
    resolveKnownArmorClass,
} from '@/lib/utils/battle/view';

export function ParticipantStats({
    participant,
    exact,
}: ParticipantStatsProps) {
    const t = useTranslations('battle.details');

    const { battle } = useBattleSceneData();

    const known = resolveKnownArmorClass(
        battle.battleLog ?? [],
        participant.basicInfo.id,
        battle.knowledge
    );

    return (
        <Section title={t('armor')}>
            <div className="flex min-h-10 items-center justify-between border-b border-white/[.08]">
                <span>{exact ? t('ac') : t('acBetween')}</span>
                <span className="font-medium text-[var(--ink)]">
                    {exact
                        ? getEffectiveArmorClass(
                              participant,
                              battle.initiativeOrder
                          )
                        : formatKnownArmorClass(known)}
                </span>
            </div>
            {!exact &&
                known.evidence.map((e, i) => (
                    <div
                        key={i}
                        className="flex min-h-8 items-center text-[13px] text-[var(--hud-muted)]"
                    >
                        {t('evidence', {
                            hit: e.hit ? 'hit' : 'miss',
                            total: e.total,
                            actor: e.actorName,
                            round: e.round,
                        })}
                    </div>
                ))}
        </Section>
    );
}
