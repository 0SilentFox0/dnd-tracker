import { useTranslations } from 'next-intl';
import { Gem } from 'lucide-react';

import { ArtifactReferenceDetail } from './detail/ArtifactReferenceDetail';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslator } from '@/lib/i18n/use-translator';
import type { ArtifactForReference } from '@/types/info-reference';

export function ArtifactReferenceCard({
    artifact,
}: {
    artifact: ArtifactForReference;
}) {
    const t = useTranslations('artifacts.reference');

    const ta = useTranslator('artifacts');

    const meta = [
        artifact.rarity ? ta(`rarity.${artifact.rarity}`) : null,
        ta(`slots.${artifact.slot}`),
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <AccordionItem
            value={artifact.id}
            className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)] last:border-b"
        >
            <AccordionTrigger className="flex items-center gap-3 p-0 hover:no-underline [&[data-state=open]>div]:border-b">
                <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left [font-family:var(--font-hud-sans)] tracking-normal">
                    <EntityIcon
                        src={artifact.icon}
                        name={artifact.name}
                        size={40}
                        className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted"
                        fallback={<Gem className="size-5" />}
                    />
                    <div className="min-w-0 flex-1">
                        <span className="hud-sc block text-sm leading-tight text-hud-ink">
                            {artifact.name}
                        </span>
                        <span className="text-xs text-hud-muted">{meta}</span>
                        <p className="mt-1.5 text-xs text-hud-muted">
                            {artifact.gear
                                ? t('gear')
                                : artifact.holderName
                                  ? t('heldBy', { name: artifact.holderName })
                                  : t('free')}
                        </p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="border-t border-hud-line p-3">
                    <ArtifactReferenceDetail item={artifact} />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
