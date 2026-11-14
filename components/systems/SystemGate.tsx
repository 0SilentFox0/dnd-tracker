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
    const [failure, setFailure] = useState<unknown>();

    const modulesKey = system.modules?.join(',');

    const ready = useSyncExternalStore(
        subscribeSystems,
        () => isSystemReady(system),
        NEVER
    );

    if (!ready && typeof window !== 'undefined')
        loadSystems(system).catch(() => undefined);

    useEffect(() => {
        loadSystems({ key: system.key, modules: system.modules }).catch(
            setFailure
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [system.key, modulesKey]);

    if (failure) throw failure;

    return ready ? children : (fallback ?? <LoadingState />);
}
