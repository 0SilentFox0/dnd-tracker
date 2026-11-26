import { useTranslations } from 'next-intl';

import { HudPill } from '@/components/hud/page';

export function RulesChangedChip({ count }: { count: number }) {
    const t = useTranslations('rules');

    if (count === 0) return null;

    return (
        <HudPill
            tone="accent"
            icon={
                <span aria-hidden className="text-hud-accent-fg">
                    ●
                </span>
            }
        >
            {t('page.changed', { count })}
        </HudPill>
    );
}
