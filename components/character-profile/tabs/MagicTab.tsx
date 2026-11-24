'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';

import { ProfileSpellBook } from '../hero/ProfileSpellBook';
import { SpellPicksNudge } from '../path';
import { useProfile } from '../ProfileContext';
import { SpellSlotColumns } from './SpellSlotColumns';

import { NewPill } from '@/components/common/entity/NewPill';
import { spellLevelMetal } from '@/components/hud';
import { HudSection } from '@/components/hud/form';
import { HudSheetHeading } from '@/components/hud/page';
import { EmptySpellBook } from '@/components/spells/book/SpellBookPages';
import { Button } from '@/components/ui/button';
import { spellLevelRoman } from '@/lib/constants/spells';
import { useSeenOnOpen } from '@/lib/hooks/notifications';
import { translateIssue } from '@/lib/i18n/translate-issue';
import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';
import { signed } from '@/lib/utils/common/format';

export function MagicTab() {
    const { sheet, campaignId } = useProfile();

    const t = useTranslations('characterProfile.magic');

    const tr = useTranslator();

    const newSpells = useSeenOnOpen(campaignId, {
        types: ['spell'],
        enabled: sheet.viewer.isOwner && !sheet.viewer.isDM,
    });

    const [open, setOpen] = useState(false);

    return (
        <>
            <SpellPicksNudge />
            {newSpells.size > 0 && (
                <NewPill count={newSpells.size} className="mb-2" />
            )}
            {sheet.magic && (
                <div className="mb-5 grid grid-cols-3 divide-x divide-hud-rule overflow-hidden rounded-[4px] border border-hud-line bg-hud-panel shadow-sm">
                    {[
                        [String(sheet.magic.saveDC), t('saveDC')],
                        [signed(sheet.magic.attackBonus), t('attack')],
                        [
                            tr(
                                `gameTerms.abilities.${sheet.magic.ability}.short`
                            ),
                            tr(
                                `gameTerms.abilities.${sheet.magic.ability}.label`
                            ),
                        ],
                    ].map(([value, label]) => (
                        <div key={label} className="min-w-0 px-3 py-3 sm:px-5">
                            <b className="hud-num block text-3xl leading-none text-hud-ink sm:text-4xl">
                                {value}
                            </b>
                            <span className="mt-1.5 block truncate text-sm text-hud-muted">
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {sheet.pact && (
                <HudSection title={t('pact')}>
                    <span
                        aria-label={t('pactSlots', {
                            current: sheet.pact.current,
                            max: sheet.pact.max,
                            level: spellLevelRoman(sheet.pact.level),
                        })}
                        className={cn(
                            'hud-sc metal-fill inline-block rounded-md px-3 py-1.5 text-sm',
                            spellLevelMetal(sheet.pact.level)
                        )}
                    >
                        {spellLevelRoman(sheet.pact.level)} ·{' '}
                        {sheet.pact.current}/{sheet.pact.max}
                    </span>
                </HudSection>
            )}
            {sheet.slots.length > 0 && (
                <HudSection
                    header={<HudSheetHeading>{t('slots')}</HudSheetHeading>}
                >
                    <SpellSlotColumns />
                </HudSection>
            )}
            {sheet.choices &&
                sheet.spells.some((s) => sheet.choices?.spellSources[s.id]) && (
                    <HudSection title={t('fromChoices')}>
                        <ul className="space-y-1 text-sm">
                            {sheet.spells
                                .filter(
                                    (s) => sheet.choices?.spellSources[s.id]
                                )
                                .map((s) => (
                                    <li
                                        key={s.id}
                                        className="flex justify-between gap-2"
                                    >
                                        <span>{s.name}</span>
                                        <span className="text-xs text-hud-muted">
                                            {translateIssue(
                                                tr,
                                                sheet.choices?.spellSources[
                                                    s.id
                                                ] ?? { message: '' }
                                            )}
                                        </span>
                                    </li>
                                ))}
                        </ul>
                    </HudSection>
                )}
            {sheet.spells.length > 0 ? (
                <>
                    <Button
                        type="button"
                        className="hud-sc mt-4 h-12 w-full gap-2 bg-hud-gold text-[var(--palette-primary-foreground,#2a1d05)] hover:brightness-110"
                        onClick={() => setOpen(true)}
                    >
                        <BookOpen className="size-5" />
                        {t('book')}
                    </Button>
                    <ProfileSpellBook
                        spells={sheet.spells}
                        slots={sheet.slots}
                        open={open}
                        onOpenChange={setOpen}
                    />
                </>
            ) : (
                <div className="mt-4 first:mt-0">
                    <EmptySpellBook text={t('emptyBook')} />
                </div>
            )}
        </>
    );
}
