import { existsSync, readFileSync } from 'node:fs';

export const parseRequires = (source) => {
    const body = /\brequires:\s*\[([^\]]*)\]/.exec(source)?.[1] ?? '';

    return [...body.matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
};

export const readRequires = (systemsDir, id) => {
    const file = new URL(`${id}/meta.ts`, systemsDir);

    return existsSync(file) ? parseRequires(readFileSync(file, 'utf8')) : [];
};

export const foreignSystemGroup = (id, ids, requiresOf) => {
    const allowed = new Set(requiresOf(id));

    return ids
        .filter((o) => o !== id && !allowed.has(o))
        .map((o) => `@/systems/${o}/**`);
};
