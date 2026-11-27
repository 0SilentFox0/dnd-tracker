'use client';

import { GraduationCap } from 'lucide-react';

import { ReferenceRowShell, type ReferenceRowState } from './ReferenceRowShell';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { useTranslator } from '@/lib/i18n/use-translator';
import { classSummaryText } from '@/lib/utils/campaigns/info-reference';
import type { ClassForReference } from '@/types/info-reference';

const MAX_TAGS = 3;

export function ClassReferenceRow({
    item,
    ...row
}: { item: ClassForReference } & ReferenceRowState) {
    const translate = useTranslator();

    const subclasses = item.subclasses.slice(0, MAX_TAGS);

    return (
        <ReferenceRowShell
            icon={{
                src: item.icon,
                fallback: <GraduationCap className="size-4" />,
            }}
            name={item.name}
            meta={item.summary
                .slice(0, 2)
                .map((line) => classSummaryText(translate, line))
                .join(' · ')}
            tags={
                subclasses.length > 0 && (
                    <span className="flex shrink-0 -space-x-1.5">
                        {subclasses.map((s) => (
                            <EntityIcon
                                key={s.id}
                                src={s.icon}
                                name={s.name}
                                size={20}
                                className="size-5 rounded-full border border-hud-line bg-hud-field text-xs text-hud-muted"
                            />
                        ))}
                    </span>
                )
            }
            row={row}
        />
    );
}
