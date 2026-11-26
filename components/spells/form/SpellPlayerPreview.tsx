'use client';

import { type ReactNode, useDeferredValue } from 'react';

import { SpellReferenceDetail } from '@/components/campaigns/info/detail/SpellReferenceDetail';
import { PlayerPreview } from '@/components/common/entity/PlayerPreview';
import type { SpellFormData } from '@/components/spells/form/spell-form-defaults';
import { toSpellReferencePreview } from '@/lib/utils/spells/spell-preview';

export function SpellPlayerPreview({
    campaignId,
    data,
    spellId,
    groupName,
    notes,
}: {
    campaignId: string;
    data: SpellFormData;
    spellId?: string;
    groupName?: string | null;
    notes?: ReactNode;
}) {
    const deferred = useDeferredValue(data);

    return (
        <PlayerPreview notes={notes}>
            <SpellReferenceDetail
                campaignId={campaignId}
                isDM={false}
                item={toSpellReferencePreview(deferred, {
                    id: spellId,
                    groupName,
                })}
            />
        </PlayerPreview>
    );
}
