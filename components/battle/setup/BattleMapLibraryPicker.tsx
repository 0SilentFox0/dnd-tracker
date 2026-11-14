'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { HudSection } from '@/components/hud/form';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import type { BattleLibraryMap } from '@/lib/hooks/battles';

export function BattleMapLibraryPicker({
    campaignId,
    library,
}: {
    campaignId: string;
    library: BattleLibraryMap;
}) {
    const t = useTranslations('battleSetup.library');

    const options = library.maps.map((m) => ({
        value: m.id,
        label: `${m.name} · ${t('size', { cols: m.cols, rows: m.rows })}`,
        disabled: Math.max(m.cols, m.rows) > MAP_LIMITS.battleMaxSide,
    }));

    const chosen = library.maps.find((m) => m.id === library.selectedId);

    return (
        <HudSection title={t('title')} className="space-y-3">
            <Label htmlFor="library-map">{t('label')}</Label>
            <SelectField
                id="library-map"
                value={library.selectedId ?? ''}
                onValueChange={(id) => library.select(id || null)}
                options={options}
                allowNone
                noneLabel={t('none')}
                disabled={library.isLinked}
            />
            <p className="text-sm text-hud-muted">
                {library.isLinked
                    ? t('linked')
                    : chosen
                      ? t('chosen', {
                            cols: chosen.cols,
                            rows: chosen.rows,
                        })
                      : t('tooLarge', { max: MAP_LIMITS.battleMaxSide })}
            </p>
            <Link
                href={`/campaigns/${campaignId}/dm/maps`}
                className="text-sm text-hud-gold-bright underline"
            >
                {t('manage')}
            </Link>
        </HudSection>
    );
}
