export type DrawerKey = 'log' | 'dm' | 'reserve' | 'tools';

export function railKeys({
    isDM,
    readOnly,
    hasMap,
    reserveCount,
}: {
    isDM: boolean;
    readOnly: boolean;
    hasMap: boolean;
    reserveCount: number;
}): DrawerKey[] {
    return [
        'log',
        ...(isDM && !readOnly ? (['dm'] as const) : []),
        ...(hasMap && reserveCount > 0 ? (['reserve'] as const) : []),
        'tools',
    ];
}
