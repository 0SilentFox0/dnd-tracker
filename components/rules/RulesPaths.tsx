'use client';

import {
    type ComponentType,
    createContext,
    type ReactNode,
    useContext,
} from 'react';

import type { RulesSectionProps } from '@/components/systems/types';

interface RulesPaths {
    paths: ReadonlySet<string>;
    items: Readonly<Record<string, ComponentType<RulesSectionProps>>>;
}

const RulesPathsContext = createContext<RulesPaths | null>(null);

export function RulesPathsProvider({
    value,
    children,
}: {
    value: RulesPaths;
    children: ReactNode;
}) {
    return (
        <RulesPathsContext.Provider value={value}>
            {children}
        </RulesPathsContext.Provider>
    );
}

/** Without a provider (an editor rendered alone) every path counts as present */
export const useHasRule = (): ((path: string) => boolean) => {
    const ctx = useContext(RulesPathsContext);

    return (path) => !ctx || ctx.paths.has(path);
};

/** Items other modules add to this section, drawn at the place of the call */
export function RulesItems({
    section,
    form,
}: { section: string } & RulesSectionProps) {
    const ctx = useContext(RulesPathsContext);

    if (!ctx) return null;

    return (
        <>
            {Object.entries(ctx.items)
                .filter(
                    ([path]) =>
                        path.startsWith(`${section}.`) && ctx.paths.has(path)
                )
                .map(([path, Item]) => (
                    <Item key={path} form={form} />
                ))}
        </>
    );
}
