import type { ReactNode } from "react";

import { PlayerViewReveal } from "./PlayerViewReveal";

import { PLAYER_VIEW_GUARD_CSS, playerViewBootstrap,type PlayerViewScope } from "@/lib/utils/common/player-view";

/** Hides the prefetched DM scene in the server HTML when this window is in player view; the reveal clears it after hydration. */
export function PlayerViewGuard({ scope, children }: { scope: PlayerViewScope; children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: playerViewBootstrap(scope) }} />
      <style dangerouslySetInnerHTML={{ __html: PLAYER_VIEW_GUARD_CSS }} />
      <div data-pv-stage className="contents">
        {children}
      </div>
      <PlayerViewReveal />
    </>
  );
}
