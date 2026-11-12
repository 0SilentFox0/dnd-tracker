'use client';

import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/common/SearchInput';
import { HudChipTabs } from '@/components/hud/page';
import type { UnitRaceChip } from '@/lib/utils/units/group-units';

interface UnitsToolbarProps {
    query: string;
    onSearch: (query: string) => void;
    chips: UnitRaceChip[];
    selected: string[];
    onToggle: (key: string) => void;
}

export function UnitsToolbar({
    query,
    onSearch,
    chips,
    selected,
    onToggle,
}: UnitsToolbarProps) {
    const t = useTranslations('units.toolbar');

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                    <SearchInput
                        value={query}
                        onChange={onSearch}
                        label={t('search')}
                    />
                </div>
            </div>
            <HudChipTabs
                ariaLabel={t('raceFilter')}
                items={chips.map((chip) => ({
                    key: chip.key,
                    active: selected.includes(chip.key),
                    onSelect: () => onToggle(chip.key),
                    label: (
                        <span className="inline-flex items-center gap-1.5">
                            <span
                                className="h-2.5 w-2.5 rounded-full bg-hud-muted"
                                style={
                                    chip.color
                                        ? { backgroundColor: chip.color }
                                        : undefined
                                }
                                aria-hidden
                            />
                            {chip.label} · {chip.count}
                        </span>
                    ),
                }))}
            />
        </div>
    );
}
