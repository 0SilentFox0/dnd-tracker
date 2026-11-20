'use client';

import { useTranslations } from 'next-intl';

import { HudChipTabs } from '@/components/hud/page';
import { NO_LAYER_KEY, WORLD_NO_SESSION_COLOR } from '@/lib/constants/world';
import type { WorldViewLayer } from '@/types/world';

interface LayerLegendProps {
    layers: Pick<WorldViewLayer, 'id' | 'name' | 'color'>[];
    hidden: ReadonlySet<string>;
    onToggle(id: string): void;
    showUnlayered?: boolean;
}

export function LayerLegend({
    layers,
    hidden,
    onToggle,
    showUnlayered = false,
}: LayerLegendProps) {
    const t = useTranslations('world.layers');

    if (layers.length === 0) return null;

    const chip = (key: string, name: string, color: string | null) => ({
        key,
        active: !hidden.has(key),
        onSelect: () => onToggle(key),
        label: (
            <span className="flex items-center gap-1.5">
                <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ background: color ?? WORLD_NO_SESSION_COLOR }}
                />
                {name}
            </span>
        ),
    });

    const items = layers.map((l) => chip(l.id, l.name, l.color));

    if (showUnlayered) items.push(chip(NO_LAYER_KEY, t('unlayered'), null));

    return (
        <div className="hud-surface max-w-full rounded-md border border-hud-rule bg-hud-surface/90 px-2 py-1 backdrop-blur-sm">
            <HudChipTabs ariaLabel={t('legend')} items={items} />
        </div>
    );
}
