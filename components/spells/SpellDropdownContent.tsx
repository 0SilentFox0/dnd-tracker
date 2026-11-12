'use client';

import { useTranslations } from 'next-intl';

import {
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { groupDisplayName } from '@/lib/constants/ungrouped';
import { getSpellGroupIcon } from '@/lib/utils/spells/spell-icons';
import type { Spell } from '@/types/spells';

interface SpellDropdownContentProps {
    groupedSpells: [string, Spell[]][];
    selectedSpellIds: string[];
    isLoading: boolean;
    onToggleSpell: (spellId: string) => void;
}

export function SpellDropdownContent({
    groupedSpells,
    selectedSpellIds,
    isLoading,
    onToggleSpell,
}: SpellDropdownContentProps) {
    const t = useTranslations('spells.dropdown');

    const tc = useTranslations('gameTerms.ungrouped');

    if (isLoading) {
        return (
            <DropdownMenuContent
                className="max-h-[500px] w-[min(400px,calc(100vw-2rem))] overflow-y-auto"
                align="start"
                sideOffset={4}
            >
                <DropdownMenuLabel>{t('loading')}</DropdownMenuLabel>
            </DropdownMenuContent>
        );
    }

    if (groupedSpells.length === 0) {
        return (
            <DropdownMenuContent
                className="max-h-[500px] w-[min(400px,calc(100vw-2rem))] overflow-y-auto"
                align="start"
                sideOffset={4}
            >
                <DropdownMenuLabel>{t('empty')}</DropdownMenuLabel>
            </DropdownMenuContent>
        );
    }

    return (
        <DropdownMenuContent
            className="max-h-[500px] w-[min(400px,calc(100vw-2rem))] overflow-y-auto"
            align="start"
            sideOffset={4}
        >
            {groupedSpells.map(([groupName, groupSpells]) => {
                const displayName = groupDisplayName(
                    groupName,
                    tc('spellGroup')
                );

                const GroupIcon = getSpellGroupIcon(groupSpells[0]?.spellGroup);

                return (
                    <div key={groupName}>
                        <DropdownMenuLabel className="sticky top-0 z-10 flex min-w-0 items-center gap-2 bg-background py-2">
                            <GroupIcon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{displayName}</span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {groupSpells.map((spell) => {
                            const isSelected = selectedSpellIds.includes(
                                spell.id
                            );

                            return (
                                <DropdownMenuCheckboxItem
                                    key={spell.id}
                                    checked={isSelected}
                                    onCheckedChange={() =>
                                        onToggleSpell(spell.id)
                                    }
                                    className="max-w-full"
                                >
                                    <div className="flex max-w-full min-w-0 flex-1 items-center gap-2">
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {spell.level === 0
                                                ? 'C'
                                                : spell.level}
                                        </span>
                                        <span className="min-w-0 truncate">
                                            {spell.name}
                                        </span>
                                    </div>
                                </DropdownMenuCheckboxItem>
                            );
                        })}
                    </div>
                );
            })}
        </DropdownMenuContent>
    );
}
