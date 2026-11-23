import { HeroCluster } from '@/components/world/map/HeroCluster';
import { useHeroDrag } from '@/lib/hooks/world';
import {
    clusterHeroes,
    HERO_CLUSTER_PX,
} from '@/lib/utils/world/hero-clusters';
import { dragGroup } from '@/lib/utils/world/hero-drag';
import type { MapPoint, WorldHero } from '@/types/world';

export interface HeroDragConfig {
    selected: string[];
    toPoint(clientX: number, clientY: number): MapPoint | null;
    onDrop(ids: string[], to: MapPoint): void;
}

interface WorldHeroesProps {
    heroes: WorldHero[];
    party?: 'party' | 'own';
    touchTargets?: boolean;
    zoom: number;
    box: { width: number; height: number };
    onHeroClick?(id: string): void;
    drag?: HeroDragConfig;
}

const NO_DRAG: HeroDragConfig = {
    selected: [],
    toPoint: () => null,
    onDrop: () => undefined,
};

export function WorldHeroes({
    heroes,
    party,
    touchTargets,
    zoom,
    box,
    onHeroClick,
    drag,
}: WorldHeroesProps) {
    const clusters = clusterHeroes(
        heroes,
        (h) => ({ x: h.x * box.width * zoom, y: h.y * box.height * zoom }),
        touchTargets ? 44 : HERO_CLUSTER_PX
    );

    const cfg = drag ?? NO_DRAG;

    const { bind, ghost } = useHeroDrag({
        toPoint: cfg.toPoint,
        groupFor: (ids) => dragGroup(ids, cfg.selected),
        onDrop: cfg.onDrop,
        positions: new Map(heroes.map((h) => [h.id, { x: h.x, y: h.y }])),
    });

    return (
        <>
            {ghost ? (
                <>
                    <svg
                        aria-hidden
                        data-testid="hero-drag-line"
                        className="pointer-events-none absolute inset-0 size-full"
                        viewBox="0 0 1 1"
                        preserveAspectRatio="none"
                    >
                        <line
                            x1={ghost.from.x}
                            y1={ghost.from.y}
                            x2={ghost.point.x}
                            y2={ghost.point.y}
                            stroke="var(--color-hud-gold-bright, #ffe08a)"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                    <span
                        aria-hidden
                        data-testid="hero-drag-ghost"
                        className="atlas-draft-dot pointer-events-none"
                        style={{
                            left: `${ghost.point.x * 100}%`,
                            top: `${ghost.point.y * 100}%`,
                            transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                        }}
                    />
                </>
            ) : null}
            {clusters.map((c) => (
                <HeroCluster
                    key={c.key}
                    cluster={c}
                    party={
                        party === 'party' ||
                        (party === 'own' && c.heroes.some((hero) => hero.own))
                    }
                    zoom={zoom}
                    onHeroClick={onHeroClick}
                    drag={drag ? bind(c.heroes.map((h) => h.id)) : undefined}
                />
            ))}
        </>
    );
}
