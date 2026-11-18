import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ArtifactSetCard } from './ArtifactSetCard';

import { HudSection } from '@/components/hud/form';
import { HudPanel } from '@/components/hud/page';
import type {
    ItemGroupsLinkProps,
    ItemGroupsPanelProps,
} from '@/components/systems/types';
import { Button } from '@/components/ui/button';

export function ArtifactSetsLink({ campaignId }: ItemGroupsLinkProps) {
    const t = useTranslations('artifacts.page');

    return (
        <Button variant="outline" className="whitespace-nowrap" asChild>
            <Link href={`/campaigns/${campaignId}/dm/system/artifact-sets`}>
                {t('setsLink')}
            </Link>
        </Button>
    );
}

export function ArtifactSetsPanel({
    campaignId,
    canEdit,
    groups,
}: ItemGroupsPanelProps) {
    const t = useTranslations('artifacts.page');

    if (groups.length === 0) return null;

    return (
        <HudPanel>
            <HudSection title={t('setsSection')}>
                <div className="space-y-4">
                    {groups.map(({ group, artifacts }) => (
                        <ArtifactSetCard
                            key={group.id}
                            variant="withArtifacts"
                            campaignId={campaignId}
                            set={group}
                            artifacts={artifacts}
                            canEdit={canEdit}
                        />
                    ))}
                </div>
            </HudSection>
        </HudPanel>
    );
}
