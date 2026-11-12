'use client';

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

import { HudCard } from '@/components/hud/page';
import { SpellIcon } from '@/components/spells/SpellIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSpellMechanics } from '@/lib/hooks/spells/useSpellMechanics';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { Spell } from '@/types/spells';

interface SelectedSpellsListProps {
    selectedSpells: Spell[];
    onRemoveSpell: (spellId: string) => void;
}

export function SelectedSpellsList({
    selectedSpells,
    onRemoveSpell,
}: SelectedSpellsListProps) {
    const t = useTranslations('spells.selected');

    const tg = useTranslator('gameTerms');

    const mechanics = useSpellMechanics();

    if (selectedSpells.length === 0) {
        return (
            <p className="py-4 text-center text-sm text-muted-foreground">
                {t('empty')}
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm font-medium">{t('title')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {selectedSpells.map((spell) => {
                    return (
                        <HudCard key={spell.id} className="relative">
                            <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:h-16 sm:w-16">
                                    <SpellIcon
                                        spell={spell}
                                        size={64}
                                        className="h-full w-full object-cover"
                                        iconClassName="h-6 w-6"
                                    />
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="truncate text-sm font-semibold">
                                            {spell.name}
                                        </h4>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 shrink-0 p-0 hover:bg-transparent"
                                            onClick={() =>
                                                onRemoveSpell(spell.id)
                                            }
                                            type="button"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1">
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {tg(`spellLevels.${spell.level}`)}
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
                                    </div>
                                </div>
                            </div>
                        </HudCard>
                    );
                })}
            </div>
        </div>
    );
}
