import { describe, expect, it } from 'vitest';

import type { WhatsNewEntry } from '@/lib/onboarding/types';
import { mergeWhatsNew,WHATS_NEW } from '@/lib/onboarding/whats-new';
import { SYSTEM_META } from '@/lib/utils/rules/systems/meta';

const e = (id: string, date: string): WhatsNewEntry => ({
    id,
    date,
    audience: 'all',
});

describe('whats new merge', () => {
    it('sorts by date desc and keeps core before module on a tie', () => {
        const merged = mergeWhatsNew(
            [e('c1', '2026-11-05'), e('c2', '2026-11-01')],
            [e('m1', '2026-11-05'), e('m2', '2026-11-03')]
        );

        expect(merged.map((x) => x.id)).toEqual(['c1', 'm1', 'm2', 'c2']);
    });

    it('contains module-owned entries', () => {
        const owned = SYSTEM_META.flatMap(
            (m) => ('whatsNew' in m ? m.whatsNew : []) as WhatsNewEntry[]
        );

        expect(owned.length).toBeGreaterThan(0);

        for (const entry of owned)
            expect(WHATS_NEW.map((x) => x.id)).toContain(entry.id);
    });

    it('ids are unique and the list is date-desc', () => {
        const ids = WHATS_NEW.map((x) => x.id);

        expect(new Set(ids).size).toBe(ids.length);

        for (let i = 1; i < WHATS_NEW.length; i++)
            expect(WHATS_NEW[i - 1].date >= WHATS_NEW[i].date).toBe(true);
    });
});
