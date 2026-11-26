'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { SpellReferenceDetail } from './detail/SpellReferenceDetail';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslator } from '@/lib/i18n/use-translator';
import { getShortSpellSummary } from '@/lib/utils/campaigns/info-reference';
import type { SpellForReference } from '@/types/info-reference';

interface SpellReferenceCardProps {
    campaignId: string;
    spell: SpellForReference;
    isDM: boolean;
}

export function SpellReferenceCard({
    campaignId,
    spell,
    isDM,
}: SpellReferenceCardProps) {
    const t = useTranslations('spells.reference');

    const translate = useTranslator();

    const shortSummary = getShortSpellSummary(spell, translate);

    return (
        <AccordionItem
            value={spell.id}
            className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)] last:border-b"
        >
            <AccordionTrigger className="flex items-center gap-3 p-0 hover:no-underline [&[data-state=open]>div]:border-b">
                <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left [font-family:var(--font-hud-sans)] tracking-normal">
                    <EntityIcon
                        src={spell.icon}
                        name={spell.name}
                        size={40}
                        className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted"
                        fallback={<Sparkles className="size-5" />}
                    />
                    <div className="min-w-0 flex-1">
                        <span className="hud-sc block text-sm leading-tight text-hud-ink">
                            {spell.name}
                        </span>
                        <span className="text-xs text-hud-muted">
                            {t('levelShort', { level: spell.level })}
                            {spell.groupName ? ` · ${spell.groupName}` : ''}
                        </span>
                        <p className="mt-1.5 line-clamp-2 text-xs text-hud-muted">
                            {spell.appearanceDescription?.trim() ||
                                shortSummary}
                        </p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="border-t border-hud-line p-3">
                    <SpellReferenceDetail
                        campaignId={campaignId}
                        item={spell}
                        isDM={isDM}
                    />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
