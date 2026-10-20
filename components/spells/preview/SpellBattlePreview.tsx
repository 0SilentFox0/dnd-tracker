"use client";

import { type ComponentProps, lazy, Suspense, useEffect, useSyncExternalStore } from "react";

import { spellFx } from "@/lib/utils/battle/fx";

// the battle engine and FX runtime load only when a spell is opened; React.lazy keeps next/dynamic's loader out of the entry chunk
const Panel = lazy(() => import("./SpellBattlePreviewPanel"));

const subscribe = () => () => {};

export function SpellBattlePreview(props: ComponentProps<typeof Panel>) {
  const client = useSyncExternalStore(subscribe, () => true, () => false);

  const archetype = spellFx(props.spell.name)?.archetype;

  // the signature chunk loads alongside the panel's, so the first cast plays without a wait
  useEffect(() => {
    if (archetype) void import("@/components/battle/fx/animations").then((m) => m.preloadAnimation(archetype), () => undefined);
  }, [archetype]);

  return client ? (
    <Suspense fallback={null}>
      <Panel {...props} />
    </Suspense>
  ) : null;
}
