'use client';

import type { ReactNode } from 'react';

import { MAP_MODE_UI } from './registry';

const PROVIDERS = Object.values(MAP_MODE_UI).flatMap((ui) =>
    ui.SceneProvider ? [ui.SceneProvider] : []
);

/** Fixed order: the battle mode may change without remounting the scene. */
export function ModeSceneProvider({ children }: { children: ReactNode }) {
    return PROVIDERS.reduceRight(
        (acc, Provider) => <Provider>{acc}</Provider>,
        children
    );
}
