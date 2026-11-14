'use client';

import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';

import { LoadingState } from '@/components/common/states';
import {
    isSystemReady,
    loadSystems,
    subscribeSystems,
} from '@/components/systems/install';
import type { SystemSelection } from '@/lib/utils/rules/systems/catalog';

const NEVER = () => false;

const STALE_CHUNK = /ChunkLoadError|Loading chunk|dynamically imported module/i;

const RELOAD_FLAG = 'system-gate-reloaded';

function clearReloadFlag() {
    try {
        sessionStorage.removeItem(RELOAD_FLAG);
    } catch {}
}

/** A deploy replaces chunk files under an open tab: reload once, then surface the error */
function reloadOnStaleChunk(error: unknown): boolean {
    const text = error instanceof Error ? `${error.name} ${error.message}` : '';

    if (!STALE_CHUNK.test(text)) return false;

    try {
        if (sessionStorage.getItem(RELOAD_FLAG)) return false;

        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();

        return true;
    } catch {
        return false;
    }
}

/** Server and first hydration render the fallback, so a warm server process cannot cause a mismatch */
export function SystemGate({
    system,
    children,
    fallback,
}: {
    system: SystemSelection;
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const modulesKey = system.modules?.join(',') ?? '';

    const selection = `${system.key}|${modulesKey}`;

    const [failure, setFailure] = useState<{ selection: string; error: unknown }>();

    const ready = useSyncExternalStore(
        subscribeSystems,
        () => isSystemReady(system),
        NEVER
    );

    useEffect(() => {
        let current = true;

        loadSystems({ key: system.key, modules: system.modules }).then(
            () => clearReloadFlag(),
            (error) => {
                if (current && !reloadOnStaleChunk(error))
                    setFailure({ selection, error });
            }
        );

        return () => {
            current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selection]);

    if (failure?.selection === selection) throw failure.error;

    return ready ? children : (fallback ?? <LoadingState />);
}
