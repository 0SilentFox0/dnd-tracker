'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { BattleMap } from '@/components/battle/map/BattleMap';
import { Button } from '@/components/ui/button';
import { DEFAULT_BATTLE_MAP, MAZE_MARK_SYMBOLS } from '@/lib/constants/battle';
import {
    type BattleMapPlaygroundMode,
    useBattleMapPlayground,
} from '@/lib/hooks/battle/useBattleMapPlayground';
import type { BattleScene } from '@/types/api';
import type { BattleMapConfig } from '@/types/battle';

const MODES: BattleMapPlaygroundMode[] = ['move', 'attack', 'template'];

export function DemoBattleSandbox({ scene }: { scene: BattleScene }) {
    const t = useTranslations('battle.demo');

    const authoredMap = useMemo(
        () => (scene.map ?? DEFAULT_BATTLE_MAP) as BattleMapConfig,
        [scene.map]
    );

    const {
        map,
        participants,
        activeId,
        mode,
        mazeMarkSymbol,
        view,
        actions,
        log,
        controls,
    } = useBattleMapPlayground({
        map: authoredMap,
        participants: scene.initiativeOrder,
    });

    const modes = useMemo(
        () => (map.maze ? [...MODES, 'maze-mark' as const] : MODES),
        [map.maze]
    );

    return (
        <main className="mx-auto max-w-6xl space-y-4 p-4">
            <header className="space-y-1">
                <h1 className="hud-sc text-2xl text-hud-ink">{scene.name}</h1>
                {scene.description && (
                    <p className="text-sm text-hud-muted">
                        {scene.description}
                    </p>
                )}
                <p className="text-sm text-hud-gold">{t('notice')}</p>
            </header>
            <nav aria-label={t('controls')} className="flex flex-wrap gap-2">
                {modes.map((key) => (
                    <Button
                        key={key}
                        variant={mode === key ? 'default' : 'outline'}
                        aria-pressed={mode === key}
                        onClick={() => controls.setMode(key)}
                    >
                        {t(`modes.${key}`)}
                    </Button>
                ))}
                <Button variant="outline" onClick={controls.nextTurn}>
                    {t('nextTurn')}
                </Button>
                <Button variant="outline" onClick={controls.reset}>
                    {t('reset')}
                </Button>
            </nav>
            {mode === 'maze-mark' && map.maze && (
                <div
                    role="group"
                    aria-label={t('mazeSymbol')}
                    className="flex flex-wrap gap-2"
                >
                    {MAZE_MARK_SYMBOLS.map((symbol) => (
                        <Button
                            key={symbol}
                            size="sm"
                            variant="outline"
                            aria-pressed={symbol === mazeMarkSymbol}
                            onClick={() => controls.setMazeMarkSymbol(symbol)}
                        >
                            {symbol}
                        </Button>
                    ))}
                </div>
            )}
            <div className="h-[65dvh] min-h-96">
                <BattleMap
                    map={map}
                    participants={participants}
                    view={view}
                    actions={actions}
                />
            </div>
            <section
                aria-label={t('participants')}
                className="grid gap-2 sm:grid-cols-2"
            >
                {participants.map((participant) => (
                    <button
                        key={participant.basicInfo.id}
                        type="button"
                        onClick={() =>
                            actions.onTokenClick?.(participant.basicInfo.id)
                        }
                        aria-pressed={participant.basicInfo.id === activeId}
                        className="rounded border border-hud-line bg-hud-panel p-3 text-left text-sm"
                    >
                        <strong>{participant.basicInfo.name}</strong>
                        <span className="ml-2 text-hud-muted">
                            {t('hp', {
                                current: participant.combatStats.currentHp,
                                max: participant.combatStats.maxHp,
                            })}
                        </span>
                    </button>
                ))}
            </section>
            {log.length > 0 && (
                <ol
                    aria-label={t('log')}
                    className="space-y-1 text-sm text-hud-muted"
                >
                    {log.map((entry, index) => (
                        <li key={`${index}-${entry.key}`}>
                            {t(`logEntry.${entry.key}`, entry.params)}
                        </li>
                    ))}
                </ol>
            )}
        </main>
    );
}
