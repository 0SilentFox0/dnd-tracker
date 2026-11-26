'use client';

import { Sparkles } from 'lucide-react';

import { SkillReferenceDetail } from './detail/SkillReferenceDetail';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslator } from '@/lib/i18n/use-translator';
import { getShortSkillSummary } from '@/lib/utils/campaigns/info-reference';
import type { SkillForReference } from '@/types/info-reference';

interface SkillReferenceCardProps {
    campaignId: string;
    skill: SkillForReference;
    isDM: boolean;
}

export function SkillReferenceCard({
    campaignId,
    skill,
    isDM,
}: SkillReferenceCardProps) {
    const translate = useTranslator();

    const shortSummary = getShortSkillSummary(skill, translate);

    return (
        <AccordionItem
            value={skill.id}
            className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)] last:border-b"
        >
            <AccordionTrigger className="flex items-center gap-3 p-0 hover:no-underline [&[data-state=open]>div]:border-b">
                <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left [font-family:var(--font-hud-sans)] tracking-normal">
                    <EntityIcon
                        src={skill.icon}
                        name={skill.name}
                        size={40}
                        className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted"
                        fallback={<Sparkles className="size-5" />}
                    />
                    <div className="min-w-0 flex-1">
                        <span className="hud-sc block text-sm leading-tight text-hud-ink">
                            {skill.name}
                        </span>
                        {skill.mainSkillName && (
                            <span
                                className="mt-1 inline-block rounded-full px-2 text-xs text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-line)]"
                                style={
                                    skill.mainSkillColor
                                        ? {
                                              boxShadow: `inset 0 0 0 1px ${skill.mainSkillColor}`,
                                          }
                                        : undefined
                                }
                            >
                                {skill.mainSkillName}
                            </span>
                        )}
                        <p className="mt-1.5 line-clamp-2 text-xs text-hud-muted">
                            {skill.appearanceDescription?.trim() ||
                                shortSummary}
                        </p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="border-t border-hud-line p-3">
                    <SkillReferenceDetail
                        campaignId={campaignId}
                        item={skill}
                        isDM={isDM}
                    />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
