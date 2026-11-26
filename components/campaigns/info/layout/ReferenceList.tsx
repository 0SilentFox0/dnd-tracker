'use client';

import { type KeyboardEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';

interface ReferenceGroup<T> {
    key: string;
    title: string;
    accent?: string;
    items: T[];
}

const HEX = /^#?[0-9A-Fa-f]{3,8}$/;

const accentColor = (value?: string) =>
    value && HEX.test(value)
        ? value.startsWith('#')
            ? value
            : `#${value}`
        : undefined;

function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

    const rows = Array.from(
        e.currentTarget.querySelectorAll<HTMLElement>('[data-ref-row]')
    );

    const at = rows.indexOf(document.activeElement as HTMLElement);

    const next = rows[at + (e.key === 'ArrowDown' ? 1 : -1)];

    if (!next) return;

    e.preventDefault();
    next.focus();
}

export function ReferenceList<T extends { id: string }>({
    groups,
    selected,
    renderRow,
    limit,
    onShowAll,
}: {
    groups: ReferenceGroup<T>[];
    selected: string | null;
    renderRow: (item: T, selected: boolean) => ReactNode;
    limit?: number;
    onShowAll?: () => void;
}) {
    const t = useTranslations('dashboard.reference.list');

    const total = groups.reduce((sum, g) => sum + g.items.length, 0);

    const capped = limit !== undefined && total > limit;

    const shown = groups.map((g, i) => {
        const before = groups
            .slice(0, i)
            .reduce((sum, prev) => sum + prev.items.length, 0);

        return g.items.slice(0, Math.max((capped ? limit : total) - before, 0));
    });

    return (
        <div role="group" onKeyDown={moveFocus} className="space-y-1">
            {groups.map((group, i) => {
                const items = shown[i];

                if (items.length === 0) return null;

                const dot = accentColor(group.accent);

                return (
                    <section key={group.key}>
                        <h3 className="hud-sc sticky top-[var(--shell-header-h,57px)] z-[1] flex items-center gap-2 bg-hud-page/95 px-2 py-1.5 text-[13px] tracking-[.1em] text-hud-muted uppercase">
                            {dot ? (
                                <span
                                    aria-hidden
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: dot }}
                                />
                            ) : null}
                            <span className="flex-1 truncate">
                                {group.title}
                            </span>
                            <span className="tabular-nums">
                                {group.items.length}
                            </span>
                        </h3>
                        <div>
                            {items.map((item) => (
                                <div key={item.id}>
                                    {renderRow(item, item.id === selected)}
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
            {capped && onShowAll ? (
                <HudButton
                    onClick={onShowAll}
                    className="w-full rounded-lg px-2 py-2 text-left text-sm text-hud-accent-fg hover:bg-hud-raised"
                >
                    {t('showAll', { count: total })}
                </HudButton>
            ) : null}
        </div>
    );
}
