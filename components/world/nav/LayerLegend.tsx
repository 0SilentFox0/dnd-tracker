'use client';

import { useTranslations } from 'next-intl';

import { HudChipTabs } from '@/components/hud/page';
import { WORLD_NO_SESSION_COLOR } from '@/lib/constants/world';
import type { WorldViewLayer } from '@/types/world';

interface LayerLegendProps {
    layers: Pick<WorldViewLayer, 'id' | 'name' | 'color'>[];
    hidden: ReadonlySet<string>;
    onToggle(id: string): void;
}

export function LayerLegend({ layers, hidden, onToggle }: LayerLegendProps) {
    const t = useTranslations('world.layers');

    if (layers.length === 0) return null;

    const items = layers.map((layer) => ({
        key: layer.id,
        active: !hidden.has(layer.id),
        onSelect: () => onToggle(layer.id),
        label: (
            <span className="flex items-center gap-1.5">
                <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{
                        background: layer.color ?? WORLD_NO_SESSION_COLOR,
                    }}
                />
                {layer.name}
            </span>
        ),
    }));

    return (
        <div className="hud-surface max-w-full rounded-md border border-hud-rule bg-hud-surface/90 px-2 py-1 backdrop-blur-sm">
            <HudChipTabs ariaLabel={t('legend')} items={items} />
        </div>
    );
}
