'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import type { HeroPanelProps } from '@/components/systems/types';
import { useDispelPanel } from '@/systems/wfrp/hooks/useDispelPanel';

export function DispelPanel({ hero }: HeroPanelProps) {
    const t = useTranslations('wfrpMagic.ui.dispel');

    const panel = useDispelPanel(hero);

    if (!panel) return null;

    return (
        <div className="mt-2 space-y-1.5">
            <div className="text-xs text-hud-soft uppercase">{t('title')}</div>
            {panel.targets.map((target) => (
                <HudButton
                    key={target.key}
                    type="button"
                    disabled={panel.isPending}
                    className="h-9 w-full border border-white/25 px-2 text-left text-sm text-[var(--bone)] disabled:opacity-40"
                    onClick={() => panel.dispel(target)}
                >
                    {t(target.mode, {
                        spell: target.spell,
                        caster: target.caster,
                    })}
                </HudButton>
            ))}
        </div>
    );
}
