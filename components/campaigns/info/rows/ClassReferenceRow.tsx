import { GraduationCap } from 'lucide-react';

import { type ReferenceRowProps, ReferenceRowShell } from './ReferenceRowShell';

import { useTranslator } from '@/lib/i18n/use-translator';
import { classSummaryText } from '@/lib/utils/campaigns/info-reference';
import type { ClassForReference } from '@/types/info-reference';

export function ClassReferenceRow({
    item,
    selected,
    onSelect,
}: ReferenceRowProps<ClassForReference>) {
    const translate = useTranslator();

    const first = item.summary[0];

    return (
        <ReferenceRowShell
            entity={item}
            fallback={<GraduationCap className="size-4" />}
            meta={first ? classSummaryText(translate, first) : null}
            selected={selected}
            onSelect={onSelect}
        />
    );
}
