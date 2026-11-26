'use client';

import { type ReactNode, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { CatalogRow } from './CatalogRow';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { HudSegmented } from '@/components/hud';
import { HudChipTabs } from '@/components/hud/page';
import { Disclosure } from '@/components/ui/disclosure';
import { ParticipantSourceType } from '@/lib/constants/battle';
import { groupDisplayName } from '@/lib/constants/ungrouped';
import {
    type BattleSetup,
    type ParticipantActions,
    useSetupUnitsFilter,
} from '@/lib/hooks/battles';
import {
    createSessionFlag,
    type StorageValue,
    useStorageValue,
} from '@/lib/hooks/common';
import { matchesQuery } from '@/lib/utils/common/text-search';
import type { BattlePreparationParticipant } from '@/types/battle';
import type { EntityStats } from '@/types/battle-setup';

export type SetupData = BattleSetup['data'];

export type SetupEntityStats = SetupData['entityStats'];

interface ParticipantCatalogProps {
    data: SetupData;
    entityStats: SetupEntityStats;
    selection: BattlePreparationParticipant[];
    actions: ParticipantActions;
}

type CatalogTab = 'heroes' | 'units';

const collapsedStores = new Map<string, StorageValue<boolean>>();

function collapsedStore(key: string) {
    let store = collapsedStores.get(key);

    if (!store) {
        store = createSessionFlag(`battle-catalog-collapsed:${key}`);
        collapsedStores.set(key, store);
    }

    return store;
}

function CatalogGroup({
    groupKey,
    title,
    children,
}: {
    groupKey: string;
    title: string;
    children: ReactNode;
}) {
    const store = collapsedStore(groupKey);

    const collapsed = useStorageValue(store, false);

    return (
        <Disclosure
            open={!collapsed}
            onOpenChange={(open) => store.set(!open)}
            summary={title}
            headingLevel={3}
            triggerClassName="hud-sc min-h-9 py-1 text-[13px] tracking-[.06em] text-hud-muted"
            className="border-b-0"
        >
            <div className="space-y-0.5 pb-2">{children}</div>
        </Disclosure>
    );
}

export function ParticipantCatalog({
    data,
    entityStats,
    selection,
    actions,
}: ParticipantCatalogProps) {
    const t = useTranslations('battleSetup.participants');

    const tGame = useTranslations('gameTerms.ungrouped');

    const locale = useLocale();

    const [tab, setTab] = useState<CatalogTab>('heroes');

    const filter = useSetupUnitsFilter(data.units);

    const query = filter.query.value;

    const heroCount = data.playerCharacters.length + data.npcCharacters.length;

    const stateOf = (id: string) => {
        const found = selection.find((p) => p.id === id);

        return found ? { side: found.side, quantity: found.quantity } : null;
    };

    const rowActions = (
        id: string,
        type: (typeof ParticipantSourceType)[keyof typeof ParticipantSourceType]
    ) => ({
        add: (side: Parameters<ParticipantActions['addToSide']>[2]) =>
            actions.addToSide(id, type, side),
        setSide: (side: Parameters<ParticipantActions['addToSide']>[2]) =>
            actions.addToSide(id, type, side),
        setQuantity: (n: number) => actions.setQuantity(id, n),
        remove: () => actions.remove(id),
    });

    const renderRows = (
        entities: { id: string; name: string; avatar: string | null }[],
        kind: 'hero' | 'unit',
        stats: Record<string, EntityStats> | undefined
    ) =>
        entities.map((entity) => (
            <CatalogRow
                key={entity.id}
                entity={entity}
                kind={kind}
                stats={stats?.[entity.id] ?? null}
                state={stateOf(entity.id)}
                actions={rowActions(
                    entity.id,
                    kind === 'hero'
                        ? ParticipantSourceType.CHARACTER
                        : ParticipantSourceType.UNIT
                )}
            />
        ));

    const heroGroups = [
        { key: 'players', title: t('players'), list: data.playerCharacters },
        { key: 'npc', title: t('npc'), list: data.npcCharacters },
    ]
        .map((g) => ({
            ...g,
            list: g.list.filter((c) => matchesQuery([c.name], query)),
        }))
        .filter((g) => g.list.length > 0);

    const raceLabel = (key: string) => groupDisplayName(key, tGame('race'));

    const byLabel = (a: string, b: string) =>
        raceLabel(a).localeCompare(raceLabel(b), locale);

    const raceOrder = [...filter.groups.keys()].sort(byLabel);

    const chips = [...filter.chips].sort((a, b) => byLabel(a.key, b.key));

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <HudSegmented
                id="battle-catalog-tab"
                label={t('catalogAria')}
                value={tab}
                onValueChange={setTab}
                options={[
                    {
                        value: 'heroes',
                        label: t('tabHeroes', { count: heroCount }),
                    },
                    {
                        value: 'units',
                        label: t('tabUnits', { count: data.units.length }),
                    },
                ]}
            />
            <SearchInput
                value={filter.query.value}
                onChange={filter.query.set}
                label={t('search')}
            />
            {tab === 'units' && chips.length > 1 && (
                <HudChipTabs
                    ariaLabel={t('raceFilter')}
                    items={chips.map((chip) => ({
                        key: chip.key,
                        active: chip.active,
                        onSelect: () => filter.toggleRace(chip.key),
                        label: `${raceLabel(chip.key)} · ${chip.count}`,
                    }))}
                />
            )}
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                {tab === 'heroes' &&
                    heroGroups.map((g) => (
                        <CatalogGroup
                            key={g.key}
                            groupKey={g.key}
                            title={`${g.title} · ${g.list.length}`}
                        >
                            {renderRows(
                                g.list,
                                'hero',
                                entityStats?.characterStats
                            )}
                        </CatalogGroup>
                    ))}
                {tab === 'units' &&
                    raceOrder.map((raceKey) => {
                        const list = filter.groups.get(raceKey) ?? [];

                        return (
                            <CatalogGroup
                                key={raceKey}
                                groupKey={`race:${raceKey}`}
                                title={`${raceLabel(raceKey)} · ${list.length}`}
                            >
                                {renderRows(
                                    list,
                                    'unit',
                                    entityStats?.unitStats
                                )}
                            </CatalogGroup>
                        );
                    })}
                {tab === 'heroes' && heroGroups.length === 0 && (
                    <p className="py-6 text-center text-sm text-hud-muted">
                        {heroCount === 0 ? t('emptyHeroes') : t('noMatches')}
                    </p>
                )}
                {tab === 'units' && raceOrder.length === 0 && (
                    <p className="py-6 text-center text-sm text-hud-muted">
                        {data.units.length === 0
                            ? t('emptyUnits')
                            : t('noMatches')}
                    </p>
                )}
            </div>
        </div>
    );
}
