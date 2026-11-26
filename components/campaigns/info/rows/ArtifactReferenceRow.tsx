'use client';

import { useTranslations } from 'next-intl';
import { Gem } from 'lucide-react';

import { ReferenceRowShell, type ReferenceRowState } from './ReferenceRowShell';

import { useTranslator } from '@/lib/i18n/use-translator';
import type { ArtifactForReference } from '@/types/info-reference';

export function ArtifactReferenceRow({
    item,
    ...row
}: { item: ArtifactForReference } & ReferenceRowState) {
    const t = useTranslations('dashboard.reference.card');

    const ta = useTranslator('artifacts');

    const holder = item.gear
        ? t('gear')
        : item.holderName
          ? t('heldBy', { name: item.holderName })
          : t('free');

    return (
        <ReferenceRowShell
            icon={{ src: item.icon, fallback: <Gem className="size-4" /> }}
            name={item.name}
            meta={[
                item.rarity ? ta(`rarity.${item.rarity}`) : null,
                ta(`slots.${item.slot}`),
                holder,
            ]
                .filter(Boolean)
                .join(' · ')}
            row={row}
        />
    );
}
