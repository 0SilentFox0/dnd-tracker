import { MapHitFloat } from './MapHitFloat';
import { MapToken } from './MapToken';
import { MapTokenHud } from './MapTokenHud';
import type { PlacedToken } from './useMapStageTokens';

import { cn } from '@/lib/utils';
import { isDormant } from '@/lib/utils/abilities/engine/core/participants';
import type { BattleMapActions, BattleMapView } from '@/types/battle-grid';

export interface MapTokensLayerState {
    rotated: boolean;
    painting: boolean;
    passAll: boolean;
    movingId: string | null;
}

export interface MapTokensLayerHandlers {
    onTokenClick: (id: string) => unknown;
    onTokenHover: (id: string | null) => void;
}

interface Props {
    placed: PlacedToken[];
    view?: BattleMapView;
    actions?: BattleMapActions;
    state: MapTokensLayerState;
    handlers: MapTokensLayerHandlers;
}

export function MapTokensLayer({
    placed,
    view,
    actions,
    state,
    handlers,
}: Props) {
    const { rotated, painting, passAll, movingId } = state;

    const { onTokenClick, onTokenHover } = handlers;

    const onCellHover = actions?.onCellHover;

    const modeView = view?.mode;

    return (
        <div
            data-map-tokens
            className={cn(rotated && '*:-rotate-90')}
            style={painting ? { opacity: 0.35 } : undefined}
        >
            {placed.map(({ p, placement }) => (
                <MapToken
                    key={p.basicInfo.id}
                    participant={p}
                    placement={placement}
                    selected={view?.selectedId === p.basicInfo.id}
                    current={view?.currentId === p.basicInfo.id}
                    onClick={onTokenClick}
                    onHover={
                        painting || !onCellHover ? undefined : onTokenHover
                    }
                    passThrough={passAll || movingId === p.basicInfo.id}
                    impact={view?.impactFor?.(p.basicInfo.id)}
                    effects={view?.effects?.get(p.basicInfo.id)}
                    dormant={!!modeView?.showDormant && isDormant(p)}
                />
            ))}
            {placed.map(({ p, placement }) => {
                const id = p.basicInfo.id;

                const hud = view?.hud?.get(id);

                return (
                    <MapTokenHud
                        key={`hud:${id}`}
                        participant={p}
                        placement={placement}
                        exact={hud?.exact ?? false}
                        raised={
                            view?.selectedId === id || view?.currentId === id
                        }
                        impact={view?.impactFor?.(id)}
                        effects={view?.effects?.get(id)}
                        onReturn={
                            view?.returnId === id
                                ? actions?.onReturn
                                : undefined
                        }
                    />
                );
            })}
            {placed.map(({ p, placement }) => (
                <MapHitFloat
                    key={`float:${p.basicInfo.id}`}
                    participant={p}
                    placement={placement}
                    impact={view?.impactFor?.(p.basicInfo.id)}
                />
            ))}
        </div>
    );
}
