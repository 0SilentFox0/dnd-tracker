'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useRovingIndex } from '@/lib/hooks/common';

interface RowRenderState {
    selected: boolean;
    onSelect: () => void;
    tabIndex: 0 | -1;
    ref: (el: HTMLElement | null) => void;
}

interface ReferenceListProps<T> {
    groups: {
        key: string;
        title: ReactNode;
        accent?: string;
        items: T[];
    }[];
    selected: string | null;
    onSelect: (key: string) => void;
    renderRow: (item: T, row: RowRenderState) => ReactNode;
    keyOf: (item: T) => string;
    limit?: number;
    onShowAll?: () => void;
}

export function ReferenceList<T>({
    groups,
    selected,
    onSelect,
    renderRow,
    keyOf,
    limit,
    onShowAll,
}: ReferenceListProps<T>) {
    const t = useTranslations('dashboard.reference.list');

    const flat = groups.flatMap((g) => g.items);

    const cap = limit ?? flat.length;

    const total = flat.length;

    const selectedIndex = flat.findIndex((it) => keyOf(it) === selected);

    const [focus, setFocus] = useState<number | null>(null);

    const active = Math.min(
        focus ?? Math.max(selectedIndex, 0),
        Math.max(cap - 1, 0)
    );

    const roving = useRovingIndex({
        count: Math.min(cap, total),
        active,
        onMove: setFocus,
    });

    let index = 0;

    return (
        <div onKeyDown={roving.onKeyDown}>
            {groups.map((g) => {
                const items = g.items.filter(() => index++ < cap);

                if (items.length === 0) return null;

                const start = index - g.items.length;

                return (
                    <section key={g.key}>
                        <h3
                            className="hud-sc sticky top-0 z-[1] bg-hud-page/97 px-3 py-1.5 text-xs text-hud-muted"
                            style={
                                g.accent
                                    ? { boxShadow: `inset 2px 0 0 ${g.accent}` }
                                    : undefined
                            }
                        >
                            {g.title}
                        </h3>
                        {items.map((item, i) => {
                            const key = keyOf(item);

                            const at = start + i;

                            return (
                                <div key={key}>
                                    {renderRow(item, {
                                        selected: key === selected,
                                        onSelect: () => {
                                            setFocus(at);
                                            onSelect(key);
                                        },
                                        tabIndex: roving.tabIndex(at),
                                        ref: roving.itemRef(at),
                                    })}
                                </div>
                            );
                        })}
                    </section>
                );
            })}
            {total > cap && onShowAll && (
                <Button
                    variant="ghost"
                    onClick={onShowAll}
                    className="mt-2 w-full"
                >
                    {t('showAll', { count: total })}
                </Button>
            )}
        </div>
    );
}
