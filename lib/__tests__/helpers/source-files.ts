import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');

export function sources(dir: string): string[] {
    return fs
        .readdirSync(path.join(ROOT, dir), { withFileTypes: true })
        .flatMap((e) => {
            const rel = path.join(dir, e.name);

            if (e.isDirectory())
                return e.name === '__tests__' || e.name === 'node_modules'
                    ? []
                    : sources(rel);

            return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)
                ? [rel]
                : [];
        });
}

export function readSource(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
