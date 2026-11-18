'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { PrintPageShell } from '@/components/common/PrintPageShell';
import { SpellCard } from '@/components/spells/list/SpellCard';
import { groupDisplayName } from '@/lib/constants/ungrouped';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    convertGroupedSpellsToArray,
    groupSpellsByGroupAndLevel,
} from '@/lib/utils/spells/spells';
import type { Spell, SpellGroup } from '@/types/spells';

interface PrintSpellsPageClientProps {
    campaignId: string;
    campaignName: string;
    initialSpells: Spell[];
    spellGroups: SpellGroup[];
}

const noopRemove = () => {};

const noopMove = () => {};

export function PrintSpellsPageClient({
    campaignId,
    campaignName,
    initialSpells,
    spellGroups,
}: PrintSpellsPageClientProps) {
    const t = useTranslations('spells.print');

    const tg = useTranslator('gameTerms');

    const groupedSpells = useMemo(
        () =>
            convertGroupedSpellsToArray(
                groupSpellsByGroupAndLevel(initialSpells)
            ),
        [initialSpells]
    );

    return (
        <PrintPageShell
            title={t('title', { campaignName })}
            hint={t('hint')}
            button={t('button')}
            empty={groupedSpells.length === 0 ? t('empty') : null}
        >
            {groupedSpells.map(([groupName, levels]) => {
                const totalSpells = levels.reduce(
                    (sum, [, spells]) => sum + spells.length,
                    0
                );

                return (
                    <section key={groupName} className="print-section mb-8">
                        <div className="mb-4 flex items-baseline gap-3 border-b py-3">
                            <h2 className="text-xl font-semibold">
                                {groupDisplayName(
                                    groupName,
                                    tg('ungrouped.spellGroup')
                                )}
                            </h2>
                            <span className="text-sm text-muted-foreground">
                                {t('count', { count: totalSpells })}
                            </span>
                        </div>

                        {levels.map(([level, levelSpells]) => (
                            <div key={level} className="mb-6">
                                <h3 className="mb-2 text-base font-semibold tracking-wide text-muted-foreground uppercase">
                                    {tg(`spellLevels.${level}`)}
                                    <span className="ml-2 text-xs font-normal">
                                        ({levelSpells.length})
                                    </span>
                                </h3>
                                <div className="flex flex-col gap-3">
                                    {levelSpells.map((spell) => (
                                        <div
                                            key={spell.id}
                                            className="print-card"
                                        >
                                            <SpellCard
                                                spell={spell}
                                                campaignId={campaignId}
                                                spellGroups={spellGroups}
                                                onRemoveFromGroup={noopRemove}
                                                onMoveToGroup={noopMove}
                                                printMode
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                );
            })}
        </PrintPageShell>
    );
}
