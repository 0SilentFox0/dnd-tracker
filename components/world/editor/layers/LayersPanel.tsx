'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crosshair, Plus } from 'lucide-react';

import { useWorldEditorContext } from '../WorldEditorContext';
import { LayerRow } from './LayerRow';

import { HudButton } from '@/components/hud';
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
    gameStyle?: boolean;
}

export function LayersPanel({
    campaignId,
    layers,
    activeId,
    onActive,
    heroes,
    imageEdit,
    gameStyle,
}: LayersPanelProps) {
    const t = useTranslations('world.layers');

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { detail, editor } = useWorldEditorContext();

    const ops = editor.layers;

    const mapAspect = detail ? detail.map.width / detail.map.height : 1;

    const counts = new Map<string, number>();

    for (const m of detail?.markers ?? [])
        if (m.layerId) counts.set(m.layerId, (counts.get(m.layerId) ?? 0) + 1);

    const selected =
        layers.find((layer) => layer.id === (selectedId ?? activeId)) ??
        layers[0];

    const editorRow = (layer: WorldLayer) => (
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
                onActivate: () => {
                    if (gameStyle) setSelectedId(layer.id);

                    onActive(activeId === layer.id ? null : layer.id);
                },
                editingImage: imageEdit.layerId === layer.id,
                onToggleImageEdit: () =>
                    imageEdit.set(
                        imageEdit.layerId === layer.id ? null : layer.id
                    ),
                gameStyle,
            }}
        />
    );

    return (
        <section
            aria-label={t('title')}
            className={gameStyle ? 'world-layer-manager' : 'space-y-2'}
        >
            <div className="flex items-center justify-between gap-2">
                <h3 className="world-layer-title hud-sc text-sm text-hud-ink">
                    {t('title')}
                </h3>
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
            ) : gameStyle && selected ? (
                <>
                    <ul className="world-layer-list">
                        {layers.map((layer) => (
                            <li key={layer.id}>
                                <HudButton
                                    type="button"
                                    className="world-layer-select"
                                    aria-pressed={layer.id === selected.id}
                                    onClick={() => setSelectedId(layer.id)}
                                >
                                    <span
                                        aria-hidden
                                        className="world-layer-color"
                                        style={{
                                            backgroundColor:
                                                layer.color ??
                                                'var(--color-hud-muted)',
                                        }}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-left">
                                        {layer.name}
                                    </span>
                                    {layer.id === activeId && (
                                        <Crosshair
                                            className="size-4 shrink-0 text-hud-gold"
                                            aria-label={t('active')}
                                        />
                                    )}
                                </HudButton>
                            </li>
                        ))}
                    </ul>
                    <ul>{editorRow(selected)}</ul>
                </>
            ) : (
                <ul className="space-y-2">{layers.map(editorRow)}</ul>
            )}
        </section>
    );
}
