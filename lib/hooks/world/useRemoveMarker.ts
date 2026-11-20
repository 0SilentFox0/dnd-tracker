'use client';

import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import type { useWorldEditor } from './useWorldEditor';

import { useConfirm } from '@/lib/hooks/common';
import { isTyping } from '@/lib/utils/world/is-typing';
import type { WorldMarker } from '@/types/world';

interface Options {
    marker: WorldMarker | undefined;
    editor: ReturnType<typeof useWorldEditor>;
    select(id: string | null): void;
    /** Delete/Backspace removes the marker only while true */
    hotkey?: boolean;
}

export function useRemoveMarker({
    marker,
    editor,
    select,
    hotkey = false,
}: Options) {
    const confirm = useConfirm();

    const t = useTranslations('world.removeMarker');

    const tc = useTranslations('common.actions');

    const remove = useCallback(async () => {
        if (!marker) return;

        const ok = await confirm({
            title: t('title', { name: marker.name }),
            description: marker.childMapId
                ? t('descriptionChild')
                : t('descriptionPlain'),
            confirmLabel: tc('delete'),
            destructive: true,
        });

        if (ok && (await editor.marker.remove.mutateOk(marker.id)))
            select(null);
    }, [marker, confirm, editor, select, t, tc]);

    useEffect(() => {
        if (!hotkey || !marker) return;

        const onKey = (e: KeyboardEvent) => {
            if (
                (e.key !== 'Delete' && e.key !== 'Backspace') ||
                e.repeat ||
                isTyping(e.target) ||
                e.metaKey ||
                e.ctrlKey ||
                e.altKey
            )
                return;

            if (
                e.target instanceof Element &&
                e.target.closest('[role=dialog]')
            )
                return;

            void remove();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [hotkey, marker, remove]);

    return remove;
}
