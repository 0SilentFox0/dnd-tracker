'use client';

import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { useSceneSlot } from '@/components/battle/scene/layout/SceneSlots';

export function DockWaiting({ name }: { name: string }) {
    const t = useTranslations('battle.dock');

    const slot = useSceneSlot('dock');

    if (!slot) return null;

    return createPortal(
        <div
            role="status"
            className="hud-sc pointer-events-auto mb-3 rounded-xl border border-white/20 bg-black/70 px-4 py-2 text-[15px] tracking-[.08em] text-[var(--ink)]"
        >
            {t('waiting', { name })}
        </div>,
        slot
    );
}
