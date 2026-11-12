export type PlayerViewScope =
    | { kind: 'battle'; id: string }
    | { kind: 'show'; id: string };

export const PLAYER_VIEW_PENDING_ATTR = 'data-pv-pending';

export const playerViewKey = (scope: PlayerViewScope) =>
    scope.kind === 'show'
        ? `player-view:show:${scope.id}`
        : `player-view:${scope.id}`;

/** Runs before first paint: marks <html> when this window's player-view flag is on, so CSS can hide the DM scene until hydration. */
export function playerViewBootstrap(scope: PlayerViewScope): string {
    const key = JSON.stringify(playerViewKey(scope)).replace(/</g, '\\u003c');

    return `try{if(sessionStorage.getItem(${key})==="on")document.documentElement.setAttribute("${PLAYER_VIEW_PENDING_ATTR}","1")}catch(e){}`;
}

export const PLAYER_VIEW_GUARD_CSS = `html[${PLAYER_VIEW_PENDING_ATTR}] [data-pv-stage]{visibility:hidden}`;
