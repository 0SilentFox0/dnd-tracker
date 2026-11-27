'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Swords } from 'lucide-react';

import { ActiveBattleBanner } from './ActiveBattleBanner';
import { BattleCard } from './BattleCard';
import { BattleRow } from './BattleRow';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { EmptyState } from '@/components/common/states';
import { SearchEmptyState } from '@/components/common/states/SearchEmptyState';
import { HudChipTabs, HudPill } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import {
    type BattleListFilter,
    useBattleListSections,
} from '@/lib/hooks/battles';
import type { BattleListCardData } from '@/types/battle';

const FILTERS: BattleListFilter[] = ['all', 'prepared', 'completed'];

export function BattleList({
    battles,
    campaignId,
    canEdit = true,
}: {
    battles: BattleListCardData[];
    campaignId: string;
    canEdit?: boolean;
}) {
    const t = useTranslations('battleSetup.list');

    const { search, filter, active, prepared, completed } =
        useBattleListSections(battles);

    const [completedOpen, setCompletedOpen] = useState<boolean | null>(null);

    if (battles.length === 0) {
        return (
            <EmptyState
                className="bg-hud-panel"
                icon={Swords}
                title={t('empty.title')}
                description={t('empty.description')}
                action={
                    canEdit && (
                        <Button asChild>
                            <Link
                                href={`/campaigns/${campaignId}/dm/battles/new`}
                            >
                                {t('empty.create')}
                            </Link>
                        </Button>
                    )
                }
            />
        );
    }

    const firstTourId = active[0]?.id ?? prepared[0]?.id ?? completed[0]?.id;

    const tour = (id: string) =>
        id === firstTourId ? 'battle.card' : undefined;

    const hasFiltered = prepared.length + completed.length > 0;

    const showEmpty =
        !hasFiltered && (search.isActive || filter.value !== 'all');

    const open =
        completedOpen ?? (filter.value === 'completed' || search.isActive);

    return (
        <div className="min-w-0 space-y-4" data-tour="battle.list">
            {active.length > 0 && (
                <section
                    aria-label={t('sections.active')}
                    className="space-y-3"
                >
                    {active.map((b) => (
                        <ActiveBattleBanner
                            key={b.id}
                            battle={b}
                            campaignId={campaignId}
                            canEdit={canEdit}
                            data-tour={tour(b.id)}
                        />
                    ))}
                </section>
            )}

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                    className="min-w-0 sm:w-72"
                    value={search.query.value}
                    onChange={search.query.set}
                    label={t('search')}
                />
                <HudChipTabs
                    ariaLabel={t('filter.label')}
                    items={FILTERS.map((key) => ({
                        key,
                        active: filter.value === key,
                        label: `${t(`filter.${key}`)} ${filter.counts[key]}`,
                        onSelect: () => {
                            filter.set(key);
                            setCompletedOpen(null);
                        },
                    }))}
                />
            </div>

            {showEmpty &&
                (search.isActive ? (
                    <SearchEmptyState
                        query={search.query.value}
                        onClear={() => search.query.set('')}
                    />
                ) : (
                    <p className="ds-inset p-4 text-center text-sm text-hud-muted">
                        {t('filterEmpty')}
                    </p>
                ))}

            {prepared.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
                    {prepared.map((b) => (
                        <BattleCard
                            key={b.id}
                            battle={b}
                            campaignId={campaignId}
                            canEdit={canEdit}
                            data-tour={tour(b.id)}
                        />
                    ))}
                </div>
            )}

            {completed.length > 0 && (
                <Disclosure
                    open={open}
                    onOpenChange={setCompletedOpen}
                    headingLevel={2}
                    summary={
                        <span className="flex items-center gap-2">
                            <span className="hud-sc text-lg text-hud-ink">
                                {t('sections.completed')}
                            </span>
                            <HudPill tone="meta">{completed.length}</HudPill>
                        </span>
                    }
                >
                    <div className="space-y-2 pt-3">
                        {completed.map((b) => (
                            <BattleRow
                                key={b.id}
                                battle={b}
                                campaignId={campaignId}
                                canEdit={canEdit}
                                data-tour={tour(b.id)}
                            />
                        ))}
                    </div>
                </Disclosure>
            )}
        </div>
    );
}
