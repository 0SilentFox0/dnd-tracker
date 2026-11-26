'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { ReferenceRowShell, type ReferenceRowState } from './ReferenceRowShell';

import type { SpellForReference } from '@/types/info-reference';

export function SpellReferenceRow({
    item,
    ...row
}: { item: SpellForReference } & ReferenceRowState) {
    const t = useTranslations('reference.card');

    return (
        <ReferenceRowShell
            icon={{ src: item.icon, fallback: <Sparkles className="size-4" /> }}
            name={item.name}
            meta={[t('levelShort', { level: item.level }), item.groupName]
                .filter(Boolean)
                .join(' · ')}
            row={row}
        />
    );
}
