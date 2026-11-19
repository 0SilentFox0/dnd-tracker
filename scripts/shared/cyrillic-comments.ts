// pnpm ratchet:cyrillic-comments [--write]: ratchets/cyrillic-comments-exempt.json = { file: count } of comments with Cyrillic (only shrinks)
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export const ROOT = path.resolve(__dirname, '../..');

export const COMMENTS_FILE = 'ratchets/cyrillic-comments-exempt.json';

const SCAN_DIRS = [
    'app',
    'components',
    'lib',
    'systems',
    'scripts',
    'types',
] as const;

const SKIP_DIRS = new Set(['node_modules', '.next', 'data', 'messages']);

const SOURCE_FILE = /\.(tsx?|mjs)$/;

const CYRILLIC = /[Ѐ-ӿ]/;

export const countCyrillicComments = (text: string, file = 'x.tsx'): number => {
    const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const found = new Map<number, string>();

    const jsxText: [number, number][] = [];

    const visit = (node: ts.Node) => {
        const children = node.getChildren(source);

        if (node.kind === ts.SyntaxKind.JsxText) {
            jsxText.push([node.pos, node.end]);
        } else if (children.length === 0) {
            const ranges = [
                ...(ts.getLeadingCommentRanges(text, node.pos) ?? []),
                ...(ts.getTrailingCommentRanges(text, node.end) ?? []),
            ];

            ranges.forEach((r) => found.set(r.pos, text.slice(r.pos, r.end)));
        }

        children.forEach(visit);
    };

    visit(source);

    return [...found].filter(
        ([pos, body]) =>
            CYRILLIC.test(body) &&
            !jsxText.some(([from, to]) => pos >= from && pos < to)
    ).length;
};

const walk = (rel: string): string[] =>
    fs
        .readdirSync(path.join(ROOT, rel), { withFileTypes: true })
        .flatMap((entry) => {
            const next = path.posix.join(rel, entry.name);

            if (entry.isDirectory())
                return SKIP_DIRS.has(entry.name) ? [] : walk(next);

            return SOURCE_FILE.test(entry.name) ? [next] : [];
        });

export const scanCyrillicComments = (): Record<string, number> => {
    const rootFiles = fs
        .readdirSync(ROOT, { withFileTypes: true })
        .filter((e) => e.isFile() && SOURCE_FILE.test(e.name))
        .map((e) => e.name);

    const files = [...rootFiles, ...SCAN_DIRS.flatMap((dir) => walk(dir))];

    const found: Record<string, number> = {};

    for (const file of files.sort()) {
        const text = fs.readFileSync(path.join(ROOT, file), 'utf8');

        if (!CYRILLIC.test(text)) continue;

        const n = countCyrillicComments(text, file);

        if (n > 0) found[file] = n;
    }

    return found;
};

export const readCommentsExempt = (): Record<string, number> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, COMMENTS_FILE), 'utf8'));

export const commentsProblems = (
    found: Record<string, number>,
    exempt: Record<string, number>
): string[] => [
    ...Object.entries(found)
        .filter(([file, n]) => n > (exempt[file] ?? 0))
        .map(([file, n]) => `new cyrillic comments: ${file} has ${n}`),
    ...Object.entries(exempt)
        .filter(([file, max]) => (found[file] ?? 0) < max)
        .map(([file]) => `lower the entry: ${file}`),
];

if (require.main === module) {
    const found = scanCyrillicComments();

    if (process.argv.includes('--write')) {
        const known = fs.existsSync(path.join(ROOT, COMMENTS_FILE))
            ? readCommentsExempt()
            : found;

        const grew = Object.entries(found).filter(
            ([file, n]) => n > (known[file] ?? 0)
        );

        grew.forEach(([file]) => console.error(`refusing to grow: ${file}`));

        if (grew.length) process.exit(1);

        fs.writeFileSync(
            path.join(ROOT, COMMENTS_FILE),
            JSON.stringify(found, null, 4) + '\n'
        );

        const total = Object.values(found).reduce((a, b) => a + b, 0);

        console.log(
            `${COMMENTS_FILE}: ${Object.keys(found).length} files, ${total} comments`
        );
    } else {
        const problems = commentsProblems(found, readCommentsExempt());

        problems.forEach((p) => console.error(p));
        process.exit(problems.length ? 1 : 0);
    }
}
