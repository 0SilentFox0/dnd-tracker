import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { type ReferenceRowProps, ReferenceRowShell } from './ReferenceRowShell';

import type { SpellForReference } from '@/types/info-reference';

export function SpellReferenceRow({
    item,
    selected,
    onSelect,
}: ReferenceRowProps<SpellForReference>) {
    const t = useTranslations('spells.reference');

    return (
        <ReferenceRowShell
            entity={item}
            fallback={<Sparkles className="size-4" />}
            meta={`${t('levelShort', { level: item.level })}${item.groupName ? ` · ${item.groupName}` : ''}`}
            selected={selected}
            onSelect={onSelect}
        />
    );
}
