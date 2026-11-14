import { SkillTreesList } from './skill-tree/SkillTreesList';

import type { DmPageProps } from '@/components/systems/types';

export function SkillTreesPage({ campaignId, canEdit }: DmPageProps) {
    return <SkillTreesList campaignId={campaignId} canEdit={canEdit} />;
}
