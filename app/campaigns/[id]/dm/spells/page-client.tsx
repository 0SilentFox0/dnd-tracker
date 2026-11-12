'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Printer, Wand2 } from 'lucide-react';

import { DeleteAllButton } from '@/components/common/DeleteAllButton';
import { SearchEmptyState } from '@/components/common/SearchEmptyState';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState, LoadingState } from '@/components/common/states';
import { ContentTransferButtons } from '@/components/content-import/ContentTransferButtons';
import { HudChipTabs, HudPage, HudPageHeader } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { CreateSpellGroupDialog } from '@/components/spells/dialogs/CreateSpellGroupDialog';
import { SpellGroupAccordion } from '@/components/spells/list/SpellGroupAccordion';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useSpellsList } from '@/lib/hooks/spells';

export function DMSpellsPageClient({
    campaignId,
    canEdit = true,
}: {
    campaignId: string;
    canEdit?: boolean;
}) {
    const t = useTranslations('spells');

    const list = useSpellsList(campaignId);

    const count = list.spells.length;

    const groupNames = list.view.groups.map(([groupName]) => groupName);

    return (
        <HudPage>
            <HudPageHeader
                title={t('page.title')}
                subtitle={t('page.subtitle', { count })}
                actions={
                    <>
                        {canEdit && (
                            <ContentTransferButtons
                                campaignId={campaignId}
                                kind="spells"
                            />
                        )}
                        {canEdit && (
                            <CreateSpellGroupDialog campaignId={campaignId} />
                        )}
                        {canEdit && (
                            <Button
                                className="text-xs whitespace-nowrap sm:text-sm"
                                asChild
                            >
                                <Link
                                    href={`/campaigns/${campaignId}/dm/spells/new`}
                                >
                                    {t('page.create')}
                                </Link>
                            </Button>
                        )}
                        {count > 0 && (
                            <Button
                                variant="outline"
                                className="text-xs whitespace-nowrap sm:text-sm"
                                asChild
                            >
                                <Link
                                    data-tour="libraries.print"
                                    href={`/campaigns/${campaignId}/dm/print/spells`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Printer className="mr-1 h-4 w-4" />
                                    {t('page.print')}
                                </Link>
                            </Button>
                        )}
                        {canEdit && (
                            <DeleteAllButton
                                count={count}
                                noun={t('deleteAll.noun')}
                                confirm={{
                                    label: t('deleteAll.label'),
                                    description: t('deleteAll.description', {
                                        count,
                                    }),
                                }}
                                actions={{ onConfirm: list.actions.removeAll }}
                            />
                        )}
                    </>
                }
            />
            {canEdit && <OnboardingHint id="dm.spells" />}
            {list.listFilter.tags.length > 0 && (
                <div data-tour="libraries.filters">
                    <HudChipTabs
                        ariaLabel={t('page.listAria')}
                        items={[
                            {
                                key: 'all',
                                label: t('page.filterAll'),
                                active: list.listFilter.value === null,
                                onSelect: () => list.listFilter.set(null),
                            },
                            ...list.listFilter.tags.map((tag) => ({
                                key: tag,
                                label: tag,
                                active: list.listFilter.value === tag,
                                onSelect: () => list.listFilter.set(tag),
                            })),
                        ]}
                    />
                </div>
            )}

            {list.isLoading && count === 0 ? (
                <LoadingState rows={6} label={t('page.loading')} />
            ) : count === 0 ? (
                <EmptyState
                    icon={Wand2}
                    title={t('page.emptyTitle')}
                    description={t('page.emptyDescription')}
                />
            ) : (
                <>
                    <div data-tour="libraries.search">
                        <SearchInput
                            value={list.search.query.value}
                            onChange={list.search.query.set}
                            label={t('page.search')}
                        />
                    </div>
                    {list.view.groups.length === 0 ? (
                        <SearchEmptyState
                            query={list.search.query.value}
                            onClear={() => list.search.query.set('')}
                        />
                    ) : (
                        <Accordion
                            key={
                                list.search.isActive
                                    ? groupNames.join('|')
                                    : 'all'
                            }
                            type="multiple"
                            defaultValue={groupNames}
                            className="space-y-2"
                        >
                            {list.view.groups.map(
                                ([groupName, levels], index) => {
                                    return (
                                        <SpellGroupAccordion
                                            key={groupName}
                                            groupName={groupName}
                                            levels={levels}
                                            campaignId={campaignId}
                                            spellGroups={list.view.spellGroups}
                                            spellActions={{
                                                onRemoveFromGroup:
                                                    list.actions
                                                        .removeFromGroup,
                                                onMoveToGroup:
                                                    list.actions.moveToGroup,
                                            }}
                                            canEdit={canEdit}
                                            tour={index === 0}
                                        />
                                    );
                                }
                            )}
                        </Accordion>
                    )}
                </>
            )}
        </HudPage>
    );
}
