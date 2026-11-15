'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { FxBadgeLabels } from '@/components/fx/runtime/badge-labels';
import { useText } from '@/lib/i18n/use-text';
import { FX_BADGE_VALUES, type SystemFx } from '@/lib/utils/battle/fx';

export function useFxBadgeLabels(fx?: SystemFx): FxBadgeLabels {
    const t = useTranslations('spells.fx.badges');

    const text = useText();

    const thorns = fx?.badges?.thorns
        ? text(fx.badges.thorns)
        : t('thorns', { value: FX_BADGE_VALUES.thorns });

    const rust = fx?.badges?.rust
        ? text(fx.badges.rust)
        : t('rust', { value: FX_BADGE_VALUES.rust });

    const raincloud = fx?.badges?.raincloud
        ? text(fx.badges.raincloud)
        : t('raincloud', { value: FX_BADGE_VALUES.raincloud });

    const might = fx?.badges?.might ? text(fx.badges.might) : t('might');

    const siphon = fx?.badges?.siphon
        ? text(fx.badges.siphon)
        : t('siphon', { value: FX_BADGE_VALUES.siphon });

    const stoneskin = fx?.badges?.stoneskin
        ? text(fx.badges.stoneskin)
        : t('stoneskin');

    return useMemo(
        () => ({ thorns, rust, raincloud, might, siphon, stoneskin }),
        [thorns, rust, raincloud, might, siphon, stoneskin]
    );
}
