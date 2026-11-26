import { useTranslations } from 'next-intl';
import { Gem } from 'lucide-react';

import { type ReferenceRowProps, ReferenceRowShell } from './ReferenceRowShell';

import { useTranslator } from '@/lib/i18n/use-translator';
import type { ArtifactForReference } from '@/types/info-reference';

export function ArtifactReferenceRow({
    item,
    selected,
    onSelect,
}: ReferenceRowProps<ArtifactForReference>) {
    const t = useTranslations('artifacts.reference');

    const ta = useTranslator('artifacts');

    const meta = [
        item.rarity ? ta(`rarity.${item.rarity}`) : null,
        ta(`slots.${item.slot}`),
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <ReferenceRowShell
            entity={item}
            fallback={<Gem className="size-4" />}
            meta={meta}
            trailing={
                item.gear
                    ? t('gear')
                    : item.holderName
                      ? t('heldBy', { name: item.holderName })
                      : t('free')
            }
            selected={selected}
            onSelect={onSelect}
        />
    );
}
