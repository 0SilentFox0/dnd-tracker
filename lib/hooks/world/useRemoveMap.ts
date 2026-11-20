'use client';

import { useTranslations } from 'next-intl';

import type { useWorldEditor } from './useWorldEditor';

import { useConfirm } from '@/lib/hooks/common';
import { subtreeMapIds } from '@/lib/utils/world/tree';
import type { WorldMapSummary } from '@/types/world';

export function useRemoveMap(
    maps: WorldMapSummary[],
    editor: ReturnType<typeof useWorldEditor>
) {
    const confirm = useConfirm();

    const t = useTranslations('world');

    const tc = useTranslations('common.actions');

    return async (map: Pick<WorldMapSummary, 'id' | 'name'>) => {
        const nested = subtreeMapIds(maps, map.id).length - 1;

        const ok = await confirm({
            title: t('removeMap.title', { name: map.name }),
            description: t('removeMap.description', { nested }),
            confirmLabel: tc('delete'),
            destructive: true,
        });

        return ok && (await editor.map.remove.mutateOk(map.id));
    };
}
