'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { MARKER_ICON } from './marker-icons';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { HudButton, HudToggleChip } from '@/components/hud';
import { WORLD_MARKER_ICON_KEYS } from '@/lib/constants/world';
import { useSearch } from '@/lib/hooks/common';
import type { MarkerKind, WorldMarker } from '@/types/world';

interface PlaceSearchBarProps {
    markers: WorldMarker[];
    onPick(id: string): void;
}

const fieldsOf = (m: WorldMarker) => [m.name, m.description];

const isMarkerIconKey = (
    key: string
): key is (typeof WORLD_MARKER_ICON_KEYS)[number] =>
    (WORLD_MARKER_ICON_KEYS as readonly string[]).includes(key);

const KINDS = ['point', 'zone'] as const satisfies readonly MarkerKind[];

export function PlaceSearchBar({ markers, onPick }: PlaceSearchBarProps) {
    const t = useTranslations('world');

    const search = useSearch(markers, fieldsOf, 0);

    const [kind, setKind] = useState<MarkerKind | null>(null);

    const [icon, setIcon] = useState<string | null>(null);

    const icons = [
        ...new Set(markers.flatMap((m) => (m.icon ? [m.icon] : []))),
    ];

    const active = search.isActive || kind !== null || icon !== null;

    const results = search.items.filter(
        (m) => (!kind || m.kind === kind) && (!icon || m.icon === icon)
    );

    const iconLabel = (key: string) =>
        isMarkerIconKey(key) ? t(`markerKinds.${key}`) : key;

    return (
        <div className="flex flex-col gap-2">
            <SearchInput
                value={search.query.value}
                onChange={search.query.set}
                label={t('search.label')}
                placeholder={t('search.placeholder')}
            />
            <div
                role="group"
                aria-label={t('search.legend')}
                className="flex flex-wrap gap-1"
            >
                {KINDS.map((k) => (
                    <HudToggleChip
                        key={k}
                        active={kind === k}
                        onClick={() => setKind(kind === k ? null : k)}
                    >
                        {t(
                            k === 'point'
                                ? 'search.kindPoint'
                                : 'search.kindZone'
                        )}
                    </HudToggleChip>
                ))}
                {icons.map((key) => {
                    const Icon = MARKER_ICON[key];

                    return (
                        <HudToggleChip
                            key={key}
                            active={icon === key}
                            onClick={() => setIcon(icon === key ? null : key)}
                        >
                            {Icon ? (
                                <Icon
                                    className="mr-1 inline size-3"
                                    aria-hidden
                                />
                            ) : null}
                            {iconLabel(key)}
                        </HudToggleChip>
                    );
                })}
            </div>
            {active ? (
                <ul className="flex max-h-60 flex-col overflow-y-auto">
                    {results.length ? (
                        results.map((m) => (
                            <li key={m.id}>
                                <HudButton
                                    className="w-full truncate rounded px-2 py-1 text-left text-sm text-hud-ink hover:bg-white/10"
                                    onClick={() => onPick(m.id)}
                                >
                                    {m.name}
                                </HudButton>
                            </li>
                        ))
                    ) : (
                        <li className="px-2 py-1 text-xs text-hud-muted">
                            {t('search.empty')}
                        </li>
                    )}
                </ul>
            ) : null}
        </div>
    );
}
