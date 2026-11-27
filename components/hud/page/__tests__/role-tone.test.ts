import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);

        if (n === '__tests__' || n === 'node_modules') return [];

        return statSync(p).isDirectory()
            ? walk(p)
            : /\.tsx$/.test(n)
              ? [p]
              : [];
    });

describe('HudPill tones', () => {
    it('role tone only on role badges', () => {
        const hits = ['app', 'components', 'systems']
            .flatMap((d) => walk(join(process.cwd(), d)))
            .filter((f) => /tone="role"|\? 'role'/.test(readFileSync(f, 'utf8')))
            .map((f) => f.split('/').pop())
            .sort();

        expect(hits).toEqual(['CampaignMembersList.tsx', 'ProfileCampaigns.tsx']);
    });
});
