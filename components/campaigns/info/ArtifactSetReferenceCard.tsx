import { useTranslations } from 'next-intl';
import { Gem } from 'lucide-react';

import { ArtifactSetBlock } from './detail/ArtifactSetBlock';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import type { ArtifactSetForReference } from '@/types/info-reference';

export function ArtifactSetReferenceCard({
    set,
}: {
    set: ArtifactSetForReference;
}) {
    const t = useTranslations('artifacts.reference');

    return (
        <AccordionItem
            value={set.id}
            className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)] last:border-b"
        >
            <AccordionTrigger className="flex items-center gap-3 p-0 hover:no-underline [&[data-state=open]>div]:border-b">
                <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left [font-family:var(--font-hud-sans)] tracking-normal">
                    <EntityIcon
                        src={set.icon}
                        name={set.name}
                        size={40}
                        className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted"
                        fallback={<Gem className="size-5" />}
                    />
                    <div className="min-w-0 flex-1">
                        <span className="hud-sc block text-sm leading-tight text-hud-ink">
                            {set.name}
                        </span>
                        {set.artifactNames.length > 0 && (
                            <p className="mt-1.5 line-clamp-2 text-xs text-hud-muted">
                                {t('setItems', {
                                    names: set.artifactNames.join(', '),
                                })}
                            </p>
                        )}
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="border-t border-hud-line p-3">
                    <ArtifactSetBlock set={set} />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
