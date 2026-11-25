'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';

import { HudSection } from '@/components/hud/form';
import { MapCatalogDialog } from '@/components/maps/MapCatalogDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import type { BattleLibraryMap } from '@/lib/hooks/battles';

export function BattleMapLibraryPicker({
    campaignId,
    library,
    onClear,
}: {
    campaignId: string;
    library: BattleLibraryMap;
    onClear?: () => void;
}) {
    const t = useTranslations('battleSetup.library');

    const options = library.maps.map((m) => ({
        value: m.id,
        label: `${m.name} · ${t('size', { cols: m.cols, rows: m.rows })}`,
        disabled: Math.max(m.cols, m.rows) > library.maxSide,
    }));

    const anyTooLarge = options.some((o) => o.disabled);

    const chosen = library.maps.find((m) => m.id === library.selectedId);

    return (
        <HudSection title={t('title')} className="space-y-3">
            <Label htmlFor="library-map">{t('label')}</Label>
            <SelectField
                id="library-map"
                value={library.selectedId ?? ''}
                onValueChange={(id) => {
                    if (!id) onClear?.();

                    void library.select(id || null);
                }}
                options={options}
                allowNone={library.canUnlink}
                noneLabel={t('none')}
                disabled={library.isLocked}
            />
            <p className="text-sm text-hud-muted">
                {library.isLocked
                    ? t('locked')
                    : library.wasLinked && library.isChanged && !chosen
                      ? t('ownFromLinked')
                      : library.isLinked
                        ? t('linked')
                        : chosen
                          ? t('chosen', {
                                cols: chosen.cols,
                                rows: chosen.rows,
                            })
                          : anyTooLarge
                            ? t('tooLarge', { max: library.maxSide })
                            : null}
            </p>
            {library.canImportCatalog ? (
                <Button
                    variant="outline"
                    disabled={library.isImportingCatalog}
                    onClick={() => library.setCatalogOpen(true)}
                >
                    <Download className="mr-2 h-4 w-4" />
                    {t('catalog')}
                </Button>
            ) : null}
            <Link
                href={`/campaigns/${campaignId}/dm/maps`}
                className="text-sm text-hud-ink underline"
            >
                {t('manage')}
            </Link>
            {library.catalogOpen ? (
                <MapCatalogDialog
                    open={library.catalogOpen}
                    onOpenChange={library.setCatalogOpen}
                    onImport={library.importCatalogEntry}
                    pending={library.isImportingCatalog}
                />
            ) : null}
        </HudSection>
    );
}
