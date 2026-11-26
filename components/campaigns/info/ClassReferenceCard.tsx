import { GraduationCap } from 'lucide-react';

import { ClassReferenceDetail } from './detail/ClassReferenceDetail';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslator } from '@/lib/i18n/use-translator';
import { classSummaryText } from '@/lib/utils/campaigns/info-reference';
import type { ClassForReference } from '@/types/info-reference';

export function ClassReferenceCard({
    gameClass,
}: {
    gameClass: ClassForReference;
}) {
    const translate = useTranslator();

    const summary = gameClass.summary.map((line) =>
        classSummaryText(translate, line)
    );

    return (
        <AccordionItem
            value={gameClass.id}
            className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)] last:border-b"
        >
            <AccordionTrigger className="flex items-center gap-3 p-0 hover:no-underline [&[data-state=open]>div]:border-b">
                <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left [font-family:var(--font-hud-sans)] tracking-normal">
                    <EntityIcon
                        src={gameClass.icon}
                        name={gameClass.name}
                        size={40}
                        className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted"
                        fallback={<GraduationCap className="size-5" />}
                    />
                    <div className="min-w-0 flex-1">
                        <span className="hud-sc block text-sm leading-tight text-hud-ink">
                            {gameClass.name}
                        </span>
                        <p className="mt-1.5 line-clamp-2 text-xs text-hud-muted">
                            {summary.slice(0, 2).join(' · ')}
                        </p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="border-t border-hud-line p-3">
                    <ClassReferenceDetail item={gameClass} />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
