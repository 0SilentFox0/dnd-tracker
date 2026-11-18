'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Maximize, Minus, Plus } from 'lucide-react';

import { GraphLegend } from './GraphLegend';
import {
    GraphScene,
    type GraphSceneActions,
    type GraphSceneView,
} from './GraphScene';

import { Button } from '@/components/ui/button';
import { useGraphViewport } from '@/lib/hooks/scenario';
import type { PositionedGraph } from '@/lib/utils/scenario/graph/layout';

export interface ScenarioGraphViewProps {
    graph: PositionedGraph;
    view: GraphSceneView & { focus: { id: string; n: number } | null };
    actions: GraphSceneActions;
}

export function ScenarioGraphView({
    graph,
    view,
    actions,
}: ScenarioGraphViewProps) {
    const t = useTranslations('scenarioGraph');

    const { focus, ...sceneView } = view;

    const byId = useMemo(
        () => new Map(graph.nodes.map((n) => [n.id, n])),
        [graph.nodes]
    );

    const { svgRef, box, zoomAt, fit, handlers } = useGraphViewport(
        graph,
        focus,
        byId
    );

    return (
        <div className="relative size-full overflow-hidden rounded-lg border bg-gradient-to-b from-card/30 to-card/70">
            <svg
                ref={svgRef}
                role="group"
                aria-label={t('graph.label')}
                viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
                className="size-full touch-none text-foreground select-none"
                {...handlers}
                onClick={(e) =>
                    e.target === e.currentTarget && actions.onClear()
                }
            >
                <GraphScene
                    graph={graph}
                    byId={byId}
                    box={box}
                    view={sceneView}
                    actions={actions}
                />
            </svg>
            <div className="absolute top-2 left-2 flex flex-col gap-1">
                <Button
                    size="icon"
                    variant="outline"
                    aria-label={t('toolbar.zoomIn')}
                    onClick={() => zoomAt(1 / 1.3)}
                >
                    <Plus />
                </Button>
                <Button
                    size="icon"
                    variant="outline"
                    aria-label={t('toolbar.zoomOut')}
                    onClick={() => zoomAt(1.3)}
                >
                    <Minus />
                </Button>
                <Button
                    size="icon"
                    variant="outline"
                    aria-label={t('toolbar.fit')}
                    onClick={fit}
                >
                    <Maximize />
                </Button>
            </div>
            <GraphLegend showSequence={view.showSequence} />
        </div>
    );
}
