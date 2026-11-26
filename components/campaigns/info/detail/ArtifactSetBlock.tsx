import { useTranslations } from 'next-intl';

import { DetailSection } from './ReferenceDetailShell';

import { AbilityFlowList } from '@/components/abilities/flow/AbilityFlow';
import type { ArtifactSetForReference } from '@/types/info-reference';

export function ArtifactSetBlock({ set }: { set: ArtifactSetForReference }) {
    const t = useTranslations('artifacts.reference');

    return (
        <DetailSection title={`${t('set')}: ${set.name}`}>
            <div className="space-y-2">
                {set.description ? (
                    <p className="whitespace-pre-line">{set.description}</p>
                ) : null}
                {set.artifactNames.length > 0 ? (
                    <p className="text-hud-muted">
                        {t('setItems', { names: set.artifactNames.join(', ') })}
                    </p>
                ) : null}
                {set.bonuses.length > 0 ? (
                    <div>
                        <p className="hud-sc mb-1 text-xs text-hud-ink">
                            {t('setBonuses')}
                        </p>
                        <AbilityFlowList lines={set.bonuses} />
                    </div>
                ) : null}
            </div>
        </DetailSection>
    );
}
