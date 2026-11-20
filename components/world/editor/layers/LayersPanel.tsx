'use client';

import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';

import { useWorldEditorContext } from '../WorldEditorContext';
import { LayerRow } from './LayerRow';

import { Button } from '@/components/ui/button';
import { MAX_WORLD_LAYERS } from '@/lib/constants/world';
import type { RosterHero } from '@/types/characters';
import type { WorldLayer } from '@/types/world';

interface LayersPanelProps {
    campaignId: string;
    layers: WorldLayer[];
    activeId: string | null;
    onActive(id: string | null): void;
    heroes: Pick<RosterHero, 'id' | 'name'>[];
    imageEdit: { layerId: string | null; set(id: string | null): void };
}

export function LayersPanel({
    campaignId,
    layers,
    activeId,
    onActive,
    heroes,
    imageEdit,
}: LayersPanelProps) {
    const t = useTranslations('world.layers');

    const { detail, editor } = useWorldEditorContext();

    const ops = editor.layers;

    const mapAspect = detail ? detail.map.width / detail.map.height : 1;

    const counts = new Map<string, number>();

    for (const m of detail?.markers ?? [])
        if (m.layerId) counts.set(m.layerId, (counts.get(m.layerId) ?? 0) + 1);

    return (
        <section aria-label={t('title')} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <h3 className="hud-sc text-sm text-hud-ink">{t('title')}</h3>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={layers.length >= MAX_WORLD_LAYERS}
                    title={
                        layers.length >= MAX_WORLD_LAYERS
                            ? t('limit')
                            : undefined
                    }
                    onClick={() =>
                        void ops.create.mutateOk({
                            name: t('defaultName', { n: layers.length + 1 }),
                        })
                    }
                >
                    <Plus className="size-3.5" aria-hidden />
                    {t('add')}
                </Button>
            </div>
            {layers.length === 0 ? (
                <p className="text-xs text-hud-muted">{t('empty')}</p>
            ) : (
                <ul className="space-y-2">
                    {layers.map((layer) => (
                        <LayerRow
                            key={layer.id}
                            campaignId={campaignId}
                            layer={layer}
                            ops={ops}
                            heroes={heroes}
                            markerCount={counts.get(layer.id) ?? 0}
                            mapAspect={mapAspect}
                            state={{
                                active: activeId === layer.id,
                                onActivate: () =>
                                    onActive(
                                        activeId === layer.id ? null : layer.id
                                    ),
                                editingImage: imageEdit.layerId === layer.id,
                                onToggleImageEdit: () =>
                                    imageEdit.set(
                                        imageEdit.layerId === layer.id
                                            ? null
                                            : layer.id
                                    ),
                            }}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
