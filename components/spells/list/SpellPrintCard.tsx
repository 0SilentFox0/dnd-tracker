'use client';

import { Sparkles } from 'lucide-react';

import { SpellComponentsLine } from '@/components/spells/SpellComponentsLine';
import { SpellIcon } from '@/components/spells/SpellIcon';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { spellLevelRoman } from '@/lib/constants/spells';
import { useSpellMechanics } from '@/lib/hooks/spells/useSpellMechanics';
import { useTranslator } from '@/lib/i18n/use-translator';
import { getSpellGroupIcon } from '@/lib/utils/spells/spell-icons';
import type { Spell } from '@/types/spells';

export function SpellPrintCard({ spell }: { spell: Spell }) {
    const tg = useTranslator('gameTerms');

    const mechanics = useSpellMechanics();

    const SpellGroupIcon = getSpellGroupIcon(spell.spellGroup);

    return (
        <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
                <div className="mb-2 flex items-start gap-3">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:h-16 sm:w-16">
                        <SpellIcon
                            spell={spell}
                            size={64}
                            className="h-full w-full object-cover"
                            iconClassName="h-6 w-6 sm:h-8 sm:w-8"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                            <CardTitle className="min-w-0 flex-1 truncate text-sm sm:text-base">
                                {spell.name}
                            </CardTitle>
                            <Badge
                                variant={
                                    spell.level === 0 ? 'secondary' : 'default'
                                }
                                className="flex shrink-0 items-center gap-1 text-xs"
                            >
                                <Sparkles className="h-3 w-3" />
                                <span className="hidden sm:inline">
                                    {tg(`spellLevels.${spell.level}`)}
                                </span>
                                <span className="sm:hidden">
                                    {spellLevelRoman(spell.level)}
                                </span>
                            </Badge>
                        </div>
                    </div>
                </div>
                <CardDescription className="mt-2 flex flex-wrap gap-1 sm:gap-2">
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-xs"
                    >
                        <SpellGroupIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">
                            {spell.spellGroup?.name ||
                                tg('ungrouped.spellGroup')}
                        </span>
                        <span className="max-w-[60px] truncate sm:hidden">
                            {spell.spellGroup?.name?.[0] || '-'}
                        </span>
                    </Badge>
                    {mechanics(spell).map((label) => (
                        <Badge
                            key={label}
                            variant="outline"
                            className="text-xs"
                        >
                            {label}
                        </Badge>
                    ))}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
                <div className="flex-1 text-xs text-muted-foreground sm:text-sm">
                    {spell.description && <p>{spell.description}</p>}
                </div>
                <SpellComponentsLine spell={spell} className="mt-2" />
            </CardContent>
        </Card>
    );
}
