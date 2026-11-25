'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { QueryState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useMapCatalog } from '@/lib/hooks/battle-maps';
import { useSearch } from '@/lib/hooks/common';
import { toMediaUrl } from '@/lib/utils/common/image-url';
import type { MapCatalogEntry } from '@/types/map-catalog';

const EMPTY_ENTRIES: MapCatalogEntry[] = [];

const catalogFields = (entry: MapCatalogEntry) => [entry.name, entry.category];

export function MapCatalogDialog({
    open,
    onOpenChange,
    onImport,
    pending = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (entry: MapCatalogEntry) => Promise<unknown>;
    pending?: boolean;
}) {
    const t = useTranslations('maps.catalog');

    const query = useMapCatalog(open);

    const [selectedId, setSelectedId] = useState('');

    const [importError, setImportError] = useState('');

    const search = useSearch(query.data ?? EMPTY_ENTRIES, catalogFields, 0);

    const filtered = search.items;

    const selected =
        filtered.find((entry) => entry.id === selectedId) ?? filtered[0];

    const handleImport = async () => {
        if (!selected) return;

        setImportError('');
        try {
            await onImport(selected);
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
                        !selected || selected.importable === false || pending
                    }
                >
                    {pending ? t('adding') : t('add')}
                </Button>
            }
        >
            <div className="space-y-3">
                <SearchInput
                    label={t('search')}
                    placeholder={t('search')}
                    value={search.query.value}
                    onChange={search.query.set}
                />
                <QueryState query={query}>
                    {() => (
                        <div className="grid min-h-[22rem] gap-4 md:grid-cols-[minmax(14rem,0.8fr)_2fr]">
                            <div className="max-h-[55vh] space-y-1 overflow-y-auto rounded border p-1">
                                {filtered.map((entry) => (
                                    <Button
                                        key={entry.id}
                                        variant="ghost"
                                        aria-pressed={selected?.id === entry.id}
                                        onClick={() => setSelectedId(entry.id)}
                                        className={`block h-auto w-full rounded p-2 text-left text-sm font-normal whitespace-normal ${selected?.id === entry.id ? 'bg-hud-panel-2 text-hud-ink' : 'hover:bg-muted'}`}
                                    >
                                        {entry.previewUrl ? (
                                            <Image
                                                src={toMediaUrl(entry.previewUrl)}
                                                alt=""
                                                width={160}
                                                height={100}
                                                unoptimized
                                                className="mb-2 h-20 w-full rounded object-cover"
                                            />
                                        ) : null}
                                        <span className="block font-medium">
                                            {entry.name}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {entry.category}
                                        </span>
                                    </Button>
                                ))}
                                {filtered.length === 0 ? (
                                    <p className="p-3 text-sm">
                                        {t('noResults')}
                                    </p>
                                ) : null}
                            </div>
                            <div className="min-w-0 space-y-3">
                                {selected ? (
                                    <>
                                        <h3 className="font-medium">
                                            {selected.name}
                                        </h3>
                                        {selected.previewUrl ? (
                                            <Image
                                                src={toMediaUrl(selected.previewUrl)}
                                                alt={selected.name}
                                                width={640}
                                                height={640}
                                                unoptimized
                                                className="max-h-[38vh] w-full rounded border object-contain"
                                            />
                                        ) : null}
                                        {selected.importable === false ? (
                                            <p
                                                role="alert"
                                                className="text-sm text-destructive"
                                            >
                                                {t('importUnavailable')}
                                            </p>
                                        ) : null}
                                        <p className="text-xs text-muted-foreground">
                                            {t('attribution', {
                                                attribution:
                                                    selected.attribution,
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
                </QueryState>
            </div>
        </ResponsiveDialog>
    );
}
