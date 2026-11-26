import { Sparkles } from 'lucide-react';

import { type ReferenceRowProps, ReferenceRowShell } from './ReferenceRowShell';

import type { SkillForReference } from '@/types/info-reference';

export function SkillReferenceRow({
    item,
    selected,
    onSelect,
}: ReferenceRowProps<SkillForReference>) {
    return (
        <ReferenceRowShell
            entity={item}
            fallback={<Sparkles className="size-4" />}
            meta={item.mainSkillName}
            selected={selected}
            onSelect={onSelect}
        />
    );
}
