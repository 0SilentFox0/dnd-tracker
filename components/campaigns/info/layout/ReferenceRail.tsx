'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, Search, X } from 'lucide-react';

import { ReferenceFilterFields } from './ReferenceFilterFields';

import { HudButton } from '@/components/hud';
import { HUD_CHIP_ACTIVE_CLASS, HUD_CHIP_CLASS } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { shortcutBlocked, useMediaQuery } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import type { ReferenceFilters, SectionTab } from '@/types/info-reference';

const XL_QUERY = '(min-width: 1280px)';

interface ReferenceRailProps {
    filters: ReferenceFilters;
    counts: Record<SectionTab, number>;
}

export function ReferenceRail({ filters, counts }: ReferenceRailProps) {
    const t = useTranslations('dashboard.reference');

    const { search, section, panel, hasActive, clearAll, classMode } = filters;

    const isXl = useMediaQuery(XL_QUERY, true);

    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== '/' || shortcutBlocked(e)) return;

            e.preventDefault();
            searchRef.current?.focus();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const sections = (
        [
            'all',
            classMode ? 'classes' : 'skills',
            'spells',
            'artifacts',
        ] as const
    ).map((value) => ({ value, active: section.value === value }));

    const fields = <ReferenceFilterFields filters={filters} />;

    return (
        <div className="space-y-2 bg-hud-page/97 py-1">
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-hud-muted" />
                <Input
                    ref={searchRef}
                    type="search"
                    placeholder={t('search.placeholder')}
                    value={search.value}
                    onChange={(e) => search.set(e.target.value)}
                    className="min-h-11 pl-9 md:min-h-10"
                    aria-label={
                        classMode
                            ? t('search.ariaClasses')
                            : t('search.ariaSkills')
                    }
                />
                {search.value && (
                    <HudButton
                        onClick={() => search.set('')}
                        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-1 text-hud-muted hover:text-hud-ink"
                        aria-label={t('search.clear')}
                    >
                        <X className="size-4" />
                    </HudButton>
                )}
            </div>

            <p
                aria-live="polite"
                className="px-1 text-xs text-hud-muted max-sm:text-sm"
            >
                {t('list.found', { count: counts.all })}
            </p>

            <div className="flex items-center gap-2 xl:block">
                <nav
                    aria-label={t('rail.sections')}
                    className="hud-scroll-x -mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-1 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0"
                >
                    {sections.map(({ value, active }) => (
                        <HudButton
                            key={value}
                            aria-current={active ? 'true' : undefined}
                            onClick={() => section.set(value)}
                            className={cn(
                                HUD_CHIP_CLASS,
                                'gap-2 xl:h-10 xl:justify-between',
                                active && HUD_CHIP_ACTIVE_CLASS
                            )}
                        >
                            <span>{t(`tabs.${value}`)}</span>
                            <span className="text-xs tabular-nums opacity-70 max-sm:text-sm">
                                {counts[value]}
                            </span>
                        </HudButton>
                    ))}
                </nav>

                {!isXl && (
                    <Popover open={panel.open} onOpenChange={panel.setOpen}>
                        <PopoverTrigger asChild>
                            <HudButton
                                className={cn(
                                    HUD_CHIP_CLASS,
                                    'gap-1.5',
                                    hasActive && HUD_CHIP_ACTIVE_CLASS
                                )}
                            >
                                <Filter className="size-4" />
                                {t('search.filters')}
                            </HudButton>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 space-y-3 p-3">
                            {fields}
                        </PopoverContent>
                    </Popover>
                )}
            </div>

            {hasActive && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                    <X className="mr-1 size-4" aria-hidden />
                    {t('search.reset')}
                </Button>
            )}

            {isXl && <div className="space-y-3 pt-2">{fields}</div>}
        </div>
    );
}
