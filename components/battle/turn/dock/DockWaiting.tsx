'use client';

import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { DockHp } from './DockHp';

import { useSceneSlot } from '@/components/battle/scene/layout/SceneSlots';
import { HUD_GLASS } from '@/components/hud';

export function DockWaiting({ name }: { name: string }) {
    const t = useTranslations('battle.dock');

    const slot = useSceneSlot('dock');

    if (!slot) return null;

    return createPortal(
        <div
            role="status"
            className={`${HUD_GLASS} pointer-events-auto flex flex-col gap-2 rounded-xl px-4 py-2 text-[var(--ink)]`}
        >
            <DockHp />
            <span className="hud-sc text-[15px] tracking-[.08em]">
                {t('waiting', { name })}
            </span>
        </div>,
        slot
    );
}
