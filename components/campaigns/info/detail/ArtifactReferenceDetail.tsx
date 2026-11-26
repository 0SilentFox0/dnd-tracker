import { useTranslations } from 'next-intl';
import { Gem } from 'lucide-react';

import { ArtifactSetBlock } from './ArtifactSetBlock';
import { DetailSection, ReferenceDetailShell } from './ReferenceDetailShell';
import type { ReadOnlyDetailProps } from './types';

import { AbilityFlowList } from '@/components/abilities/flow/AbilityFlow';
import { HudPill } from '@/components/hud/page';
import { useTranslator } from '@/lib/i18n/use-translator';
import type {
    ArtifactForReference,
    ArtifactSetForReference,
} from '@/types/info-reference';

export function ArtifactReferenceDetail({
    item: artifact,
    sets,
}: ReadOnlyDetailProps<ArtifactForReference> & {
    sets?: ArtifactSetForReference[];
}) {
    const t = useTranslations('artifacts.reference');

    const ta = useTranslator('artifacts');

    const set = artifact.setName
        ? sets?.find((s) => s.name === artifact.setName)
        : undefined;

    return (
        <ReferenceDetailShell
            icon={artifact.icon}
            fallback={<Gem className="size-7" />}
            name={artifact.name}
            chips={
                <>
                    {artifact.rarity ? (
                        <HudPill tone="accent">
                            {ta(`rarity.${artifact.rarity}`)}
                        </HudPill>
                    ) : null}
                    <HudPill>{ta(`slots.${artifact.slot}`)}</HudPill>
                    <HudPill tone="muted">
                        {artifact.gear
                            ? t('gear')
                            : artifact.holderName
                              ? t('heldBy', { name: artifact.holderName })
                              : t('free')}
                    </HudPill>
                </>
            }
        >
            {artifact.description ? (
                <DetailSection title={t('description')}>
                    <p className="whitespace-pre-line">
                        {artifact.description}
                    </p>
                </DetailSection>
            ) : null}
            {artifact.effects.length > 0 ? (
                <DetailSection title={t('effects')}>
                    <AbilityFlowList lines={artifact.effects} />
                </DetailSection>
            ) : null}
            {set ? <ArtifactSetBlock set={set} /> : null}
        </ReferenceDetailShell>
    );
}
