import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '../../..');

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

const IMPORT_RE =
    /(?:^|\n)\s*(?:import|export)\s+(type\s+)?([^'";]*?\sfrom\s+)?["']([^"']+)["']/g;

function resolveLocal(from: string, spec: string): string | null {
    const base = spec.startsWith('@/')
        ? path.join(ROOT, spec.slice(2))
        : spec.startsWith('.')
          ? path.resolve(path.dirname(from), spec)
          : null;

    if (!base) return null;

    for (const ext of ['', ...EXTENSIONS]) {
        const file = base + ext;

        if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
    }

    return null;
}

const typeOnly = (clause: string | undefined) => {
    const names = clause?.match(/^\s*\{([^}]*)\}\s*from\s+$/)?.[1];

    return (
        !!names &&
        names.split(',').every((n) => !n.trim() || n.trim().startsWith('type '))
    );
};

/** Static imports land in the entry chunk; `import()` / next/dynamic do not. Files in `stop` are listed but not traversed. */
export function staticGraph(
    entries: string[],
    stop: ReadonlySet<string> = new Set()
) {
    const files = new Set<string>();

    const packages = new Map<string, string>();

    const queue = entries.map((e) => path.join(ROOT, e));

    while (queue.length) {
        const file = queue.shift() as string;

        if (files.has(file)) continue;

        files.add(file);

        if (stop.has(path.relative(ROOT, file))) continue;

        for (const [, isType, clause, spec] of fs
            .readFileSync(file, 'utf8')
            .matchAll(IMPORT_RE)) {
            if (isType || typeOnly(clause)) continue;

            const local = resolveLocal(file, spec);

            if (local) queue.push(local);
            else if (!spec.startsWith('.') && !spec.startsWith('@/'))
                packages.set(spec, path.relative(ROOT, file));
        }
    }

    return {
        files: new Set([...files].map((f) => path.relative(ROOT, f))),
        packages,
    };
}
