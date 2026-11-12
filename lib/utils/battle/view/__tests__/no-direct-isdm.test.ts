import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

const SCAN = ['components', 'lib/hooks', 'app'];

const SKIP = [
    /__tests__/,
    /^lib\/server\//,
    /^lib\/utils\/api\//,
    /^app\/api\//,
];

// the real role of the session is read once here and drives the player-view flag
const ALLOWED = new Set(['lib/hooks/battle/useBattleScene.ts']);

const DIRECT_READ = /\b(?:battle|battleData|data)\??\.isDM\b/;

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);

        if (statSync(full).isDirectory())
            return name === 'node_modules' ? [] : walk(full);

        return /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
}

describe('no direct battle.isDM reads', () => {
    it('UI and hooks read the role from viewer.isDM / viewer.readOnly', () => {
        const hits = SCAN.flatMap((dir) => walk(join(ROOT, dir)))
            .map((file) => relative(ROOT, file))
            .filter(
                (file) =>
                    !SKIP.some((re) => re.test(file)) && !ALLOWED.has(file)
            )
            .flatMap((file) =>
                readFileSync(join(ROOT, file), 'utf8')
                    .split('\n')
                    .flatMap((line, i) =>
                        DIRECT_READ.test(line)
                            ? [`${file}:${i + 1}: ${line.trim()}`]
                            : []
                    )
            );

        expect(
            hits,
            'use viewer.isDM / viewer.readOnly from the scene; player view must not see the raw battle role'
        ).toEqual([]);
    });

    it('the pattern catches the forbidden shapes', () => {
        expect(DIRECT_READ.test('if (battle.isDM) return')).toBe(true);
        expect(DIRECT_READ.test('battle?.isDM === true')).toBe(true);
        expect(DIRECT_READ.test('scene.viewer.isDM')).toBe(false);
    });
});
