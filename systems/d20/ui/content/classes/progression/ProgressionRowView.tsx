'use client';

import { useTranslations } from 'next-intl';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { Disclosure } from '@/components/ui/disclosure';
import type { ProgressionItem, ProgressionRow } from '@/types/classes';

export interface ProgressionActions {
    onOpenLevel?: (level: number, column: 'base' | 'subclass' | 'pick') => void;
}

export const STATE_CLASS: Record<ProgressionRow['state'], string> = {
    reached: '',
    current: 'ring-1',
    next: '',
    future: 'opacity-50',
    template: '',
};

function ItemLabel({ item }: { item: ProgressionItem }) {
    return (
        <span>
            {item.icon ? (
                <EntityIcon
                    src={item.icon}
                    name={item.name}
                    size={20}
                    className="mr-1 inline-flex size-5 rounded align-middle"
                />
            ) : null}
            {item.name}
            {item.summary ? (
                <span className="ml-1 text-xs text-hud-muted">
                    {item.summary}
                </span>
            ) : null}
        </span>
    );
}

export function Items({
    items,
    accent,
}: {
    items: ProgressionItem[];
    accent?: string | null;
}) {
    if (items.length === 0) return <span className="text-hud-muted">-</span>;

    return (
        <ul className="space-y-1">
            {items.map((it) => (
                <li key={it.key}>
                    {it.description ? (
                        <Disclosure
                            triggerClassName="text-sm"
                            triggerStyle={
                                accent ? { color: accent } : undefined
                            }
                            summary={<ItemLabel item={it} />}
                        >
                            <p className="mt-1 text-xs whitespace-pre-line text-hud-muted">
                                {it.description}
                            </p>
                        </Disclosure>
                    ) : (
                        <span
                            className="text-sm"
                            style={accent ? { color: accent } : undefined}
                        >
                            <ItemLabel item={it} />
                        </span>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function Picks({ row }: { row: ProgressionRow }) {
    const t = useTranslations('classes.progression');

    if (row.picks.length === 0)
        return <span className="text-hud-muted">-</span>;

    return (
        <ul className="space-y-1">
            {row.picks.map((pick, i) => (
                <li key={`${i}:${pick.key}`} className="text-xs text-hud-muted">
                    {pick.kind === 'subclass' ? t('subclass') : pick.label}
                    {pick.required > 1 ? ` (${pick.required})` : ''}
                </li>
            ))}
        </ul>
    );
}
