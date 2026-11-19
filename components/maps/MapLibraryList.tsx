'use client';

import { useFormatter, useTranslations } from 'next-intl';
import {
    Copy,
    Download,
    Edit,
    Map as MapIcon,
    Plus,
    Trash2,
} from 'lucide-react';

import { CreateMapDialog } from './CreateMapDialog';
import { MapCatalogDialog } from './MapCatalogDialog';

import { ActionsMenu } from '@/components/common/entity/ActionsMenu';
import { DmCardGrid, DmListBody } from '@/components/common/entity/DmListBody';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ContentCopyButton } from '@/components/content-copy/ContentCopyButton';
import { HudCard, HudPage, HudPageHeader } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Button } from '@/components/ui/button';
import { useMapLibrary } from '@/lib/hooks/battle-maps';
import { useMapLibraryEnabled } from '@/lib/hooks/campaigns';

const DATE_FORMAT = { dateStyle: 'medium' } as const;

export function MapLibraryList({ campaignId }: { campaignId: string }) {
    const t = useTranslations('maps.list');

    const tActions = useTranslations('common.actions');

    const format = useFormatter();

    const library = useMapLibrary(campaignId);

    const libraryEnabled = useMapLibraryEnabled(campaignId);

    const { maps, actions, createDialog, catalog } = library;

    const editorHref = (id: string) => `/campaigns/${campaignId}/dm/maps/${id}`;

    return (
        <HudPage>
            <HudPageHeader
                title={t('title')}
                subtitle={t('subtitle')}
                actions={
                    <div className="flex gap-2">
                        {libraryEnabled && (
                            <ContentCopyButton
                                campaignId={campaignId}
                                kind="maps"
                            />
                        )}
                        <Button
                            variant="outline"
                            onClick={() => catalog.setOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            {t('catalog')}
                        </Button>
                        <Button
                            onClick={() => createDialog.setOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            {t('create')}
                        </Button>
                    </div>
                }
            />
            <OnboardingHint id="dm.maps" className="mb-3" />
            {library.query.isError ? (
                <ErrorState
                    error={library.query.error}
                    onRetry={() => void library.query.refetch()}
                />
            ) : (
                <DmListBody
                    isLoading={library.isLoading}
                    isEmpty={maps.length === 0}
                    loadingLabel={t('loading')}
                    empty={
                        <EmptyState
                            icon={MapIcon}
                            title={t('emptyTitle')}
                            description={t('emptyDescription')}
                        />
                    }
                >
                    <DmCardGrid>
                        {maps.map((map) => (
                            <HudCard
                                key={map.id}
                                link={{
                                    href: editorHref(map.id),
                                    label: map.name,
                                }}
                                className="flex h-full flex-col gap-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="hud-sc min-w-0 flex-1 truncate text-lg text-hud-ink">
                                        {map.name}
                                    </h3>
                                    <ActionsMenu
                                        triggerSize="sm"
                                        triggerClassName="h-8 w-8 p-0"
                                        actions={[
                                            {
                                                label: t('open'),
                                                icon: Edit,
                                                href: editorHref(map.id),
                                            },
                                            {
                                                label: t('clone'),
                                                icon: Copy,
                                                onSelect: () =>
                                                    actions.clone(map),
                                            },
                                            {
                                                label: tActions('delete'),
                                                icon: Trash2,
                                                onSelect: () =>
                                                    void actions.remove(map.id),
                                                destructive: true,
                                            },
                                        ]}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-x-3 text-sm text-hud-muted">
                                    <span>
                                        {t('size', {
                                            cols: map.cols,
                                            rows: map.rows,
                                        })}
                                    </span>
                                    <span>
                                        {t('updated', {
                                            date: format.dateTime(
                                                new Date(map.updatedAt),
                                                DATE_FORMAT
                                            ),
                                        })}
                                    </span>
                                </div>
                            </HudCard>
                        ))}
                    </DmCardGrid>
                </DmListBody>
            )}
            <CreateMapDialog
                open={createDialog.open}
                onOpenChange={createDialog.setOpen}
                pending={createDialog.isPending}
                onSubmit={actions.create}
            />
            <MapCatalogDialog
                open={catalog.open}
                onOpenChange={catalog.setOpen}
                pending={catalog.isPending}
                onImport={actions.importCatalogEntry}
            />
        </HudPage>
    );
}
