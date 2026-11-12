'use client';

import { useTranslations } from 'next-intl';

import { GrantCorruptionDialog } from './GrantCorruptionDialog';
import { MutationEffects } from './MutationEffects';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { HudSection } from '@/components/hud/form';
import { useText } from '@/lib/i18n/use-text';
import { SHEET_SLOT } from '@/systems/wfrp/rules/slots';

export function CorruptionBlock() {
    const { sheet, campaignId, characterId } = useProfile();

    const t = useTranslations('wfrpCorruption');

    const text = useText();

    const c = SHEET_SLOT.read(sheet.systemSlot)?.corruption;

    if (!c) return null;

    return (
        <HudSection title={t('title')}>
            <div className="space-y-3">
                <p className="flex flex-wrap items-center gap-2 text-sm text-hud-ink">
                    {t('points', { points: c.points, threshold: c.threshold })}
                    {c.points > c.threshold && (
                        <span className="rounded border border-hud-danger px-1.5 text-xs text-hud-danger">
                            {t('overThreshold')}
                        </span>
                    )}
                </p>
                {c.mutations.length === 0 ? (
                    <p className="text-sm text-hud-muted">{t('noMutations')}</p>
                ) : (
                    <ul className="space-y-2">
                        {c.mutations.map((m) => (
                            <li
                                key={m.id}
                                className="space-y-1 text-sm text-hud-bone"
                            >
                                <p>
                                    <span className="border-hud-border mr-2 rounded border px-1.5 text-xs text-hud-gold">
                                        {t(`kinds.${m.kind}`)}
                                    </span>
                                    {text(m.text)}
                                </p>
                                <MutationEffects effects={m.effects} />
                            </li>
                        ))}
                    </ul>
                )}
                {sheet.viewer.isDM && !sheet.review.pending && (
                    <GrantCorruptionDialog
                        campaignId={campaignId}
                        characterId={characterId}
                    />
                )}
            </div>
        </HudSection>
    );
}
