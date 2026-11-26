import { useTranslations } from 'next-intl';
import { GraduationCap } from 'lucide-react';

import { DetailSection, ReferenceDetailShell } from './ReferenceDetailShell';
import type { ReadOnlyDetailProps } from './types';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { useTranslator } from '@/lib/i18n/use-translator';
import { classSummaryText } from '@/lib/utils/campaigns/info-reference';
import type {
    ClassFeatureForReference,
    ClassForReference,
} from '@/types/info-reference';

function FeatureList({ features }: { features: ClassFeatureForReference[] }) {
    const t = useTranslations('classes.reference');

    return (
        <ul className="space-y-2">
            {features.map((f, i) => (
                <li key={i}>
                    <span className="hud-sc text-hud-ink">
                        {t('levelShort', { level: f.level })}
                    </span>
                    {f.name ? (
                        <span className="ml-2 inline-flex items-center gap-1.5 align-middle font-medium text-hud-ink">
                            {f.icon ? (
                                <EntityIcon
                                    src={f.icon}
                                    name={f.name}
                                    size={20}
                                    className="size-5 rounded text-xs"
                                />
                            ) : null}
                            {f.name}
                        </span>
                    ) : null}
                    {f.description ? (
                        <p className="mt-0.5 whitespace-pre-line text-hud-bone">
                            {f.description}
                        </p>
                    ) : null}
                </li>
            ))}
        </ul>
    );
}

export function ClassReferenceDetail({
    item: gameClass,
}: ReadOnlyDetailProps<ClassForReference>) {
    const t = useTranslations('classes.reference');

    const translate = useTranslator();

    const summary = gameClass.summary.map((line) =>
        classSummaryText(translate, line)
    );

    return (
        <ReferenceDetailShell
            icon={gameClass.icon}
            fallback={<GraduationCap className="size-7" />}
            name={gameClass.name}
        >
            <ul className="list-inside list-disc space-y-0.5 text-sm">
                {summary.map((line) => (
                    <li key={line}>{line}</li>
                ))}
            </ul>
            {gameClass.features.length > 0 ? (
                <DetailSection title={t('featuresByLevel')}>
                    <FeatureList features={gameClass.features} />
                </DetailSection>
            ) : null}
            {gameClass.subclasses.map((s) => (
                <DetailSection
                    key={s.id}
                    title={t('subclass', { name: s.name })}
                >
                    <FeatureList features={s.features} />
                </DetailSection>
            ))}
        </ReferenceDetailShell>
    );
}
