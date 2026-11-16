'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useMapCatalog } from '@/lib/hooks/battle-maps/useMapCatalog';
import { useMapCatalogPreview } from '@/lib/hooks/battle-maps/useMapCatalogPreview';
import type { UvttImport } from '@/lib/utils/battle/uvtt/parse';
import type { MapCatalogEntry } from '@/types/map-catalog';

const EMPTY_ENTRIES: MapCatalogEntry[] = [];

export function MapCatalogDialog({
    open,
    onOpenChange,
    onImport,
    pending = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (entry: MapCatalogEntry, parsed?: UvttImport) => Promise<unknown>;
    pending?: boolean;
}) {
    const t = useTranslations('maps.catalog');

    const query = useMapCatalog(open);

    const [search, setSearch] = useState('');

    const [selectedId, setSelectedId] = useState('');

    const [importError, setImportError] = useState('');

    const entries = query.data ?? EMPTY_ENTRIES;

    const filtered = useMemo(() => {
        const term = search.trim().toLocaleLowerCase();

        return term
            ? entries.filter((entry) =>
                  `${entry.name} ${entry.category}`
                      .toLocaleLowerCase()
                      .includes(term)
              )
            : entries;
    }, [entries, search]);

    const selected =
        filtered.find((entry) => entry.id === selectedId) ?? filtered[0];

    const previewQuery = useMapCatalogPreview(selected, open);

    const preview = previewQuery.data;

    const handleImport = async () => {
        if (!selected) return;

        setImportError('');
        try {
            await onImport(selected, preview ?? undefined);
            onOpenChange(false);
        } catch (error) {
            setImportError(
                error instanceof Error ? error.message : t('importFailed')
            );
        }
    };

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('title')}
            description={t('description')}
            size="lg"
            className="sm:max-w-5xl"
            hud
            footer={
                <Button
                    onClick={() => void handleImport()}
                    disabled={
                        !selected ||
                        !preview ||
                        pending ||
                        previewQuery.isLoading
                    }
                >
                    {pending ? t('adding') : t('add')}
                </Button>
            }
        >
            <div className="space-y-3">
                <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('search')}
                />
                {query.isError ? (
                    <div
                        role="alert"
                        className="space-y-2 text-sm text-destructive"
                    >
                        <p>{t('loadFailed')}</p>
                        <Button
                            variant="outline"
                            onClick={() => void query.refetch()}
                        >
                            {t('retry')}
                        </Button>
                    </div>
                ) : (
                    <div className="grid min-h-[22rem] gap-4 md:grid-cols-[minmax(14rem,0.8fr)_2fr]">
                        <div className="max-h-[55vh] space-y-1 overflow-y-auto rounded border p-1">
                            {query.isLoading ? (
                                <p className="p-3 text-sm">{t('loading')}</p>
                            ) : null}
                            {filtered.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => setSelectedId(entry.id)}
                                    className={`block w-full rounded p-2 text-left text-sm ${selected?.id === entry.id ? 'bg-hud-gold/15 text-hud-ink' : 'hover:bg-muted'}`}
                                >
                                    <span className="block font-medium">
                                        {entry.name}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        {entry.category}
                                    </span>
                                </button>
                            ))}
                            {!query.isLoading && filtered.length === 0 ? (
                                <p className="p-3 text-sm">{t('noResults')}</p>
                            ) : null}
                        </div>
                        <div className="min-w-0 space-y-3">
                            {selected ? (
                                <>
                                    <h3 className="font-medium">
                                        {selected.name}
                                    </h3>
                                    {previewQuery.isLoading ? (
                                        <p className="text-sm text-muted-foreground">
                                            {t('loadingPreview')}
                                        </p>
                                    ) : null}
                                    {previewQuery.isError ? (
                                        <p
                                            role="alert"
                                            className="text-sm text-destructive"
                                        >
                                            {t('previewFailed')}
                                        </p>
                                    ) : null}
                                    {preview ? (
                                        <Image
                                            src={preview.image}
                                            alt={selected.name}
                                            width={preview.imageWidth}
                                            height={preview.imageHeight}
                                            unoptimized
                                            className="max-h-[38vh] w-full rounded border object-contain"
                                        />
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                        {t('attribution', {
                                            attribution: selected.attribution,
                                            license: selected.license,
                                        })}
                                    </p>
                                    <a
                                        href={selected.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs underline"
                                    >
                                        {t('source')}
                                    </a>
                                </>
                            ) : null}
                            {importError ? (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    {importError}
                                </p>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </ResponsiveDialog>
    );
}
