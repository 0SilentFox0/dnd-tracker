import { beforeAll, describe, expect, it, vi } from 'vitest';

import { parseRules } from '@/lib/utils/rules/schema';
import { RULE_SYSTEM_KEYS } from '@/lib/utils/rules/systems/meta';
import { ruleSystemOf } from '@/lib/utils/rules/systems/registry';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

let systemServerOf: typeof import('@/lib/server/systems/registry').systemServerOf;

beforeAll(async () => {
    systemServerOf = (await import('@/lib/server/systems/registry'))
        .systemServerOf;
}, 30_000);

describe('SystemServer.drafts', () => {
    it.each([...RULE_SYSTEM_KEYS])(
        '%s: the drafts slot exists exactly when the system has a creation flow',
        (key) => {
            const rules = parseRules({ system: { key } });

            expect(!!systemServerOf(rules).drafts).toBe(
                !!ruleSystemOf(rules).creation
            );
        }
    );
});
