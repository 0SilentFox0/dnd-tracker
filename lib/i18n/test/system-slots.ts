import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const ROOT = process.cwd();

const IDENT = /[A-Za-z_$][\w$]*/g;

const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export interface SlotFiles {
    /** top-level SystemUi slot -> files of the components it holds */
    slots: Map<string, string[]>;
    /** dmPages section -> component files */
    dmPages: Map<string, string[]>;
}

const resolveSpec = (from: string, spec: string): string | undefined => {
    const base = normalize(
        spec.startsWith('@/') ? spec.slice(2) : join(dirname(from), spec)
    );

    return [...EXTS.map((e) => base + e), base].find(
        (p) => /\.tsx?$/.test(p) && existsSync(join(ROOT, p))
    );
};

/** Matching close bracket index of the opener at `start` */
const closeOf = (text: string, start: number): number => {
    let depth = 0;

    for (let i = start; i < text.length; i++) {
        if ('([{'.includes(text[i])) depth++;
        else if (')]}'.includes(text[i]) && --depth === 0) return i;
    }

    return text.length;
};

const entriesOf = (body: string): [string, string][] => {
    const out: [string, string][] = [];

    let depth = 0;

    let start = 0;

    const flush = (end: number) => {
        const part = body.slice(start, end).trim();

        const m = /^(?:'([^']+)'|"([^"]+)"|([\w$]+))\s*(?::([\s\S]*))?$/.exec(
            part
        );

        if (m) out.push([m[1] ?? m[2] ?? m[3], (m[4] ?? m[3] ?? '').trim()]);

        start = end + 1;
    };

    for (let i = 0; i < body.length; i++) {
        const c = body[i];

        if ('([{'.includes(c)) depth++;
        else if (')]}'.includes(c)) depth--;
        else if (c === ',' && depth === 0) flush(i);
    }

    flush(body.length);

    return out;
};

const importMap = (file: string, text: string): Map<string, string> => {
    const out = new Map<string, string>();

    const add = (name: string, spec: string) => {
        const target = resolveSpec(file, spec);

        if (target) out.set(name, target);
    };

    for (const m of text.matchAll(
        /import\s+(?!type\b)([^;]*?)\s+from\s*['"]([^'"]+)['"]/g
    )) {
        const clause = m[1];

        const def = /^([\w$]+)\s*(?:,|$)/.exec(clause);

        if (def) add(def[1], m[2]);

        const br = /\{([^}]*)\}/.exec(clause);

        for (const part of br?.[1].split(',') ?? []) {
            const [orig, alias] = part.trim().split(/\s+as\s+/);

            if (orig && !orig.startsWith('type ')) add(alias ?? orig, m[2]);
        }
    }

    for (const m of text.matchAll(
        /const\s+([\w$]+)\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]/g
    ))
        add(m[1], m[2]);

    return out;
};

/** Components (.tsx; hooks and data helpers hold no markup) held by each slot of a module's `ui/index.ts` (the registry object the route graph cannot see into). */
export function slotFilesOf(moduleId: string): SlotFiles {
    const file = `systems/${moduleId}/ui/index.ts`;

    const result: SlotFiles = { slots: new Map(), dmPages: new Map() };

    if (!existsSync(join(ROOT, file))) return result;

    const text = readFileSync(join(ROOT, file), 'utf8');

    const imports = importMap(file, text);

    const decl = /export const \w+_MODULE_UI\b[\s\S]*?=\s*(?:\w+<[^>]*>\()?(?:\(\)\s*=>\s*)?\(?\{/.exec(
        text
    );

    if (!decl) return result;

    const open = decl.index + decl[0].length - 1;

    const body = text.slice(open + 1, closeOf(text, open));

    const localObject = (name: string): string | undefined => {
        const m = new RegExp(`const\\s+${name}\\b[^=]*=\\s*\\{`).exec(text);

        return m
            ? text.slice(m.index + m[0].length, closeOf(text, m.index + m[0].length - 1))
            : undefined;
    };

    const filesIn = (value: string): string[] => {
        const expanded = /^[\w$]+$/.test(value)
            ? (localObject(value) ?? value)
            : value;

        return [
            ...new Set(
                (expanded.match(IDENT) ?? [])
                    .map((id) => imports.get(id))
                    .filter((f): f is string => !!f && f.endsWith('.tsx'))
            ),
        ];
    };

    for (const [slot, value] of entriesOf(body)) {
        if (slot === 'dmPages') {
            const inner = value.slice(value.indexOf('{') + 1, value.lastIndexOf('}'));

            for (const [section, comp] of entriesOf(inner))
                result.dmPages.set(section, filesIn(comp));
        } else result.slots.set(slot, filesIn(value));
    }

    return result;
}
