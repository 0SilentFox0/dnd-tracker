'use client';

import { useTranslations } from 'next-intl';
import { GraduationCap } from 'lucide-react';

import { DetailHeader, DetailRoot, DetailSection } from './DetailParts';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { useTranslator } from '@/lib/i18n/use-translator';
import { classSummaryText } from '@/lib/utils/campaigns/info-reference';
import type {
    ClassFeatureForReference,
    ClassForReference,
} from '@/types/info-reference';

interface ClassReferenceDetailProps {
    campaignId: string;
    item: ClassForReference;
    isDM: boolean;
}

function FeatureList({ features }: { features: ClassFeatureForReference[] }) {
    const t = useTranslations('reference.card');

    return (
        <ul className="space-y-2">
            {features.map((f, i) => (
                <li key={i}>
                    <span className="hud-sc text-hud-ink">
                        {t('levelShort', { level: f.level })}
                    </span>
                    {f.name && (
                        <span className="ml-2 inline-flex items-center gap-1.5 align-middle font-medium text-hud-ink">
                            {f.icon && (
                                <EntityIcon
                                    src={f.icon}
                                    name={f.name}
                                    size={20}
                                    className="size-5 rounded-sm text-xs"
                                />
                            )}
                            {f.name}
                        </span>
                    )}
                    {f.description && (
                        <p className="mt-0.5 whitespace-pre-line text-hud-bone">
                            {f.description}
                        </p>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function ClassReferenceDetail({ item }: ClassReferenceDetailProps) {
    const t = useTranslations('reference.card');

    const translate = useTranslator();

    const summary = item.summary.map((line) =>
        classSummaryText(translate, line)
    );

    return (
        <DetailRoot>
            <DetailHeader
                icon={item.icon}
                name={item.name}
                fallback={<GraduationCap className="size-7" />}
            />
            {summary.length > 0 && (
                <ul className="list-inside list-disc space-y-0.5 text-sm text-hud-bone">
                    {summary.map((line) => (
                        <li key={line}>{line}</li>
                    ))}
                </ul>
            )}
            {item.features.length > 0 && (
                <DetailSection title={t('featuresByLevel')}>
                    <FeatureList features={item.features} />
                </DetailSection>
            )}
            {item.subclasses.map((s) => (
                <DetailSection
                    key={s.id}
                    title={
                        <span className="flex items-center gap-1.5">
                            {s.icon && (
                                <EntityIcon
                                    src={s.icon}
                                    name={s.name}
                                    size={20}
                                    className="size-5 rounded-sm text-xs"
                                />
                            )}
                            {t('subclass', { name: s.name })}
                        </span>
                    }
                >
                    <FeatureList features={s.features} />
                </DetailSection>
            ))}
        </DetailRoot>
    );
}
