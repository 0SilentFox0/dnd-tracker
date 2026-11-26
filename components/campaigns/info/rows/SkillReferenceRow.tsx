'use client';

import { Sparkles } from 'lucide-react';

import { ReferenceRowShell, type ReferenceRowState } from './ReferenceRowShell';

import { useTranslator } from '@/lib/i18n/use-translator';
import { getShortSkillSummary } from '@/lib/utils/campaigns/info-reference';
import type { SkillForReference } from '@/types/info-reference';

export function SkillReferenceRow({
    item,
    ...row
}: { item: SkillForReference } & ReferenceRowState) {
    const translate = useTranslator();

    return (
        <ReferenceRowShell
            icon={{ src: item.icon, fallback: <Sparkles className="size-4" /> }}
            name={item.name}
            meta={item.mainSkillName ?? getShortSkillSummary(item, translate)}
            row={row}
        />
    );
}
