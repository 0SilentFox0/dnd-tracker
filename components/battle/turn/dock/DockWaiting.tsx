'use client';

import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { DockHp } from './DockHp';

import { useSceneSlot } from '@/components/battle/scene/layout/SceneSlots';

export function DockWaiting({ name }: { name: string }) {
    const t = useTranslations('battle.dock');

    const slot = useSceneSlot('dock');

    if (!slot) return null;

    return createPortal(
        <div
            role="status"
            className="pointer-events-auto flex flex-col gap-2 px-2 py-1 text-[var(--ink)] [text-shadow:0_1px_3px_#000,0_0_2px_#000]"
        >
            <DockHp />
            <span className="hud-sc text-[15px] tracking-[.08em]">
                {t('waiting', { name })}
            </span>
        </div>,
        slot
    );
}
