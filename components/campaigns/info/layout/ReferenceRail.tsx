'use client';

import { useTranslations } from 'next-intl';
import {
    BookOpen,
    Filter,
    Gem,
    GraduationCap,
    Sparkles,
    X,
} from 'lucide-react';

import { ReferenceFilterFields } from './ReferenceFilterFields';

import { HudButton } from '@/components/hud';
import { HudChipTabs } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useMediaQuery } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import type { ReferenceFilters, SectionTab } from '@/types/info-reference';

const XL_QUERY = '(min-width: 1280px)';

const SECTIONS: { value: SectionTab; icon: typeof BookOpen }[] = [
    { value: 'all', icon: BookOpen },
    { value: 'classes', icon: GraduationCap },
    { value: 'skills', icon: Sparkles },
    { value: 'spells', icon: Sparkles },
    { value: 'artifacts', icon: Gem },
];

export function ReferenceRail({
    filters,
    counts,
}: {
    filters: ReferenceFilters;
    counts: Record<SectionTab, number>;
}) {
    const t = useTranslations('dashboard.reference');

    const isXl = useMediaQuery(XL_QUERY, true);

    const { section, classMode, hasActive, clearAll } = filters;

    const sections = SECTIONS.filter(({ value }) =>
        value === 'skills' ? !classMode : value !== 'classes' || classMode
    );

    const reset = hasActive ? (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-hud-muted hover:text-hud-ink"
        >
            <X className="mr-1 size-4" />
            {t('search.reset')}
        </Button>
    ) : null;

    if (!isXl)
        return (
            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                    <HudChipTabs
                        ariaLabel={t('rail.sections')}
                        items={sections.map(({ value, icon: Icon }) => ({
                            key: value,
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <Icon className="size-4 shrink-0" />
                                    {t(`tabs.${value}`)}
                                    <span className="text-hud-muted tabular-nums">
                                        {counts[value]}
                                    </span>
                                </span>
                            ),
                            active: section.value === value,
                            onSelect: () => section.set(value),
                        }))}
                    />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <HudButton className="inline-flex h-9 shrink-0 touch-manipulation items-center gap-2 rounded-lg px-3 text-sm text-hud-ink shadow-[inset_0_0_0_1px_var(--color-hud-line)] hover:bg-hud-raised">
                            <Filter className="size-4" />
                            {t('search.filters')}
                            {hasActive ? (
                                <span
                                    aria-hidden
                                    className="size-2 rounded-full bg-hud-accent"
                                />
                            ) : null}
                        </HudButton>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 space-y-3 p-3">
                        <ReferenceFilterFields filters={filters} />
                        {reset}
                    </PopoverContent>
                </Popover>
            </div>
        );

    return (
        <div className="ds-panel space-y-3 p-2">
            <nav aria-label={t('rail.sections')} className="space-y-0.5">
                {sections.map(({ value, icon: Icon }) => (
                    <HudButton
                        key={value}
                        aria-current={
                            section.value === value ? 'true' : undefined
                        }
                        onClick={() => section.set(value)}
                        className={cn(
                            'flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-hud-muted hover:bg-hud-raised hover:text-hud-ink',
                            section.value === value &&
                                'bg-hud-panel-2 text-hud-ink shadow-[inset_3px_0_0_var(--hud-accent)]'
                        )}
                    >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1 truncate">
                            {t(`tabs.${value}`)}
                        </span>
                        <span className="tabular-nums">{counts[value]}</span>
                    </HudButton>
                ))}
            </nav>
            <div className="space-y-3 border-t border-hud-rule px-1 pt-3">
                <p className="hud-sc text-xs text-hud-muted">
                    {t('search.filters')}
                </p>
                <ReferenceFilterFields filters={filters} />
                {reset}
            </div>
        </div>
    );
}
