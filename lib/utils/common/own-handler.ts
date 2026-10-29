export const ownHandler = <T>(table: Record<string, T>, op: string): T | undefined => (Object.hasOwn(table, op) ? table[op] : undefined);
