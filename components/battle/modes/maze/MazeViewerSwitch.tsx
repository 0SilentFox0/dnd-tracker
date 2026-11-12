'use client';

import { useContext } from 'react';
import { useTranslations } from 'next-intl';

import { SelectField } from '@/components/ui/select-field';
import { BattleSceneDataContext, useBattleSceneData } from '@/lib/hooks/battle';
import { useMazeView } from '@/lib/hooks/battle/modes/maze';
import { mazeViewHeroes } from '@/lib/utils/battle/modes/maze';

/** Player view only: picks whose fog and vision are projected. */
export function MazeViewerSwitch() {
    const readOnly = useContext(BattleSceneDataContext)?.viewer.readOnly;

    return readOnly ? <Switch /> : null;
}

function Switch() {
    const t = useTranslations('battle.topBar');

    const { battle } = useBattleSceneData();

    const { view, asHero } = useMazeView();

    const heroes = mazeViewHeroes(battle.initiativeOrder ?? []);

    if (heroes.length < 2) return null;

    const current = [...(view?.ownIds ?? [])][0] ?? heroes[0].basicInfo.id;

    return (
        <label className="pointer-events-auto absolute top-2 left-2 z-30 flex items-center gap-1 text-xs text-hud-muted">
            {t('playerViewHero')}
            <SelectField
                value={current}
                onValueChange={asHero.set}
                options={heroes.map((p) => ({
                    value: p.basicInfo.id,
                    label: p.basicInfo.name,
                }))}
                className="h-7 w-36 px-2 text-xs"
            />
        </label>
    );
}
