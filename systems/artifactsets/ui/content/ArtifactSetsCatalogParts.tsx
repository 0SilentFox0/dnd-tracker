import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ArtifactSetCard } from './ArtifactSetCard';

import { HudSection } from '@/components/hud/form';
import { HudPanel } from '@/components/hud/page';
import type {
    ArtifactSetsLinkProps,
    ArtifactSetsPanelProps,
} from '@/components/systems/types';
import { Button } from '@/components/ui/button';

export function ArtifactSetsLink({ campaignId }: ArtifactSetsLinkProps) {
    const t = useTranslations('artifacts.page');

    return (
        <Button variant="outline" className="whitespace-nowrap" asChild>
            <Link href={`/campaigns/${campaignId}/dm/artifact-sets`}>
                {t('setsLink')}
            </Link>
        </Button>
    );
}

export function ArtifactSetsPanel({
    campaignId,
    canEdit,
    sets,
}: ArtifactSetsPanelProps) {
    const t = useTranslations('artifacts.page');

    if (sets.length === 0) return null;

    return (
        <HudPanel>
            <HudSection title={t('setsSection')}>
                <div className="space-y-4">
                    {sets.map(({ set, artifacts }) => (
                        <ArtifactSetCard
                            key={set.id}
                            variant="withArtifacts"
                            campaignId={campaignId}
                            set={set}
                            artifacts={artifacts}
                            canEdit={canEdit}
                        />
                    ))}
                </div>
            </HudSection>
        </HudPanel>
    );
}
