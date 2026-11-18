'use client';

import { useTranslations } from 'next-intl';

import { characterKeys } from '@/lib/hooks/characters';
import { useCrudMutation } from '@/lib/hooks/common';
import { postInspiration } from '@/systems/inspiration/api/inspiration';

export function useInspiration(campaignId: string, characterId: string) {
    const t = useTranslations('inspiration');

    return useCrudMutation({
        mutationFn: (value: boolean) =>
            postInspiration(campaignId, characterId, value),
        invalidateKeys: [
            characterKeys.sheet(campaignId, characterId),
            characterKeys.lists(campaignId),
            characterKeys.log(campaignId, characterId),
        ],
        errorText: t('failed'),
    });
}
