"use client";

import { type ComponentProps, lazy, Suspense, useSyncExternalStore } from "react";

// the battle engine and FX runtime load only when a spell is opened; React.lazy keeps next/dynamic's loader out of the entry chunk
const Panel = lazy(() => import("./SpellBattlePreviewPanel"));

const subscribe = () => () => {};

export function SpellBattlePreview(props: ComponentProps<typeof Panel>) {
  const client = useSyncExternalStore(subscribe, () => true, () => false);

  return client ? (
    <Suspense fallback={null}>
      <Panel {...props} />
    </Suspense>
  ) : null;
}
