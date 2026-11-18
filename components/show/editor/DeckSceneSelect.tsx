'use client';

import { useTranslations } from 'next-intl';

import { SelectField } from '@/components/ui/select-field';
import { useScenarioPages } from '@/lib/hooks/scenario';
import { useDeckScene } from '@/lib/hooks/show';
import type { SlideDeck } from '@/types/show';

export function DeckSceneSelect({
    campaignId,
    deck,
}: {
    campaignId: string;
    deck: SlideDeck;
}) {
    const t = useTranslations('show');

    const { data: pages = [] } = useScenarioPages(campaignId);

    const scene = useDeckScene(campaignId, deck.id);

    return (
        <label className="flex items-center gap-2 text-sm text-hud-muted">
            {t('sceneSelect.label')}
            <SelectField
                aria-label={t('sceneSelect.label')}
                value={deck.scenarioPageId ?? ''}
                disabled={scene.pending}
                onValueChange={(id) => void scene.set(id || null)}
                allowNone
                noneLabel={t('sceneSelect.none')}
                options={pages
                    .filter((p) => p.kind === 'scene')
                    .map((p) => ({ value: p.id, label: p.title }))}
                triggerClassName="h-9 w-auto rounded border-hud-rule bg-black/70 px-2 text-sm text-hud-bone data-[size=default]:h-9 dark:bg-black/70"
            />
        </label>
    );
}
