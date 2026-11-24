'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollText } from 'lucide-react';

import { QuestDetails } from './QuestDetails';
import { QuestEditor } from './QuestEditor';
import { QuestListItem } from './QuestListItem';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { EmptyState, ErrorState, QueryState } from '@/components/common/states';
import {
    HudChipTabs,
    HudPage,
    HudPageHeader,
    HudPanel,
} from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/lib/hooks/common';
import { useQuestActions, useQuests } from '@/lib/hooks/quests';
import type { QuestView } from '@/types/quests';

const fieldsOf = (q: QuestView) => [
    q.title,
    q.description,
    q.marker?.name ?? '',
];

function JournalBook({
    items,
    campaignId,
    isDM,
    readOnly,
    entry,
}: {
    items: QuestView[];
    campaignId: string;
    isDM: boolean;
    readOnly: boolean;
    entry: { quest?: string; create?: string };
}) {
    const t = useTranslations('quests');

    const [tab, setTab] = useState('active');

    const [selected, setSelected] = useState<string | null>(
        entry.quest ?? null
    );

    const [editing, setEditing] = useState<QuestView | 'new' | null>(
        isDM && entry.create === '1' ? 'new' : null
    );

    const actions = useQuestActions(campaignId);

    const search = useSearch(items, fieldsOf);

    const matchesTab = (q: QuestView, value: string) =>
        value === 'all' ||
        (value === 'tracked' ? q.tracked : q.status === value);

    const filtered = search.items.filter((q) => matchesTab(q, tab));

    const quest = filtered.find((q) => q.id === selected) ?? filtered[0];

    return (
        <>
            <HudPageHeader
                title={t('title')}
                actions={
                    isDM && (
                        <Button onClick={() => setEditing('new')}>
                            {t('new')}
                        </Button>
                    )
                }
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <HudChipTabs
                    ariaLabel={t('status')}
                    items={(
                        [
                            'all',
                            'active',
                            'completed',
                            'failed',
                            'tracked',
                        ] as const
                    ).map((key) => ({
                        key,
                        label: `${t(key)} (${items.filter((q) => matchesTab(q, key)).length})`,
                        active: tab === key,
                        onSelect: () => setTab(key),
                    }))}
                />
            </div>
            {actions.track.error && <ErrorState error={actions.track.error} />}
            {!items.length ? (
                <EmptyState
                    icon={ScrollText}
                    title={t(isDM ? 'empty' : 'emptyPlayer')}
                    action={
                        isDM ? (
                            <Button onClick={() => setEditing('new')}>
                                {t('new')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <HudPanel className="overflow-hidden !p-0">
                    <div className="grid min-w-0 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
                        <aside className="space-y-5 border-b border-hud-line p-3 lg:border-r lg:border-b-0">
                            <SearchInput
                                value={search.query.value}
                                onChange={search.query.set}
                                label={t('search')}
                                placeholder={t('search')}
                                className="[&_input]:min-h-10"
                            />
                            {(['main', 'side'] as const).map((kind) => {
                                const group = filtered.filter(
                                    (q) => q.kind === kind
                                );

                                return (
                                    group.length > 0 && (
                                        <section
                                            key={kind}
                                            className="space-y-2"
                                        >
                                            <h2 className="hud-sc flex justify-between px-2 text-xs tracking-widest text-hud-gold">
                                                {t(kind)}
                                                <span className="text-hud-muted">
                                                    {group.length}
                                                </span>
                                            </h2>
                                            {group.map((q) => (
                                                <QuestListItem
                                                    key={q.id}
                                                    quest={q}
                                                    selected={quest?.id === q.id}
                                                    onSelect={() =>
                                                        setSelected(q.id)
                                                    }
                                                />
                                            ))}
                                        </section>
                                    )
                                );
                            })}
                            {!filtered.length && (
                                <p className="p-3 text-sm text-hud-muted">
                                    {t('noResults')}
                                </p>
                            )}
                        </aside>
                        {quest ? (
                            <QuestDetails
                                quest={quest}
                                campaignId={campaignId}
                                isDM={isDM}
                                actions={{
                                    edit: () => setEditing(quest),
                                    track: () =>
                                        actions.track.mutate({
                                            id: quest.id,
                                            tracked: !quest.tracked,
                                        }),
                                    pending: actions.track.isPending,
                                    readOnly,
                                }}
                            />
                        ) : (
                            <p className="p-6 text-hud-muted">{t('select')}</p>
                        )}
                    </div>
                </HudPanel>
            )}
            <p className="text-xs text-hud-muted">{t('help')}</p>
            {editing && (
                <QuestEditor
                    campaignId={campaignId}
                    quest={editing === 'new' ? undefined : editing}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

export function Journal({
    campaignId,
    isDM,
    readOnly,
    entry,
}: {
    campaignId: string;
    isDM: boolean;
    readOnly: boolean;
    entry: { quest?: string; create?: string };
}) {
    const query = useQuests(campaignId);

    return (
        <HudPage className="hud-wide [&_nav]:flex-wrap [&_nav_button]:min-h-10">
            <QueryState query={query}>
                {(data) => (
                    <JournalBook
                        items={data.items}
                        campaignId={campaignId}
                        isDM={isDM}
                        readOnly={readOnly}
                        entry={entry}
                    />
                )}
            </QueryState>
        </HudPage>
    );
}
