import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import {
    indexBattleOperations,
    systemBattleOperation,
    systemServerOf,
} from '@/lib/server/systems/registry';
import type {
    SystemBattleOperation,
    SystemServer,
} from '@/lib/server/systems/types';

const op = (access: 'dm' | 'member'): SystemBattleOperation =>
    ({ settings: { access }, load: async () => ({}) }) as never;

const server = (battle: Record<string, SystemBattleOperation>) =>
    ({ schemas: {}, balance: {} as never, battle }) as SystemServer;

describe('systemServerOf', () => {
    it('returns the server of a known key and throws for an unknown one', () => {
        expect(systemServerOf({ system: { key: 'wfrp' } }).ai).toBeDefined();
        expect(() => systemServerOf({ system: { key: 'nope' } })).toThrow(
            'Unknown rule system: nope'
        );
        expect(() => systemServerOf({ system: { key: 'toString' } })).toThrow(
            'Unknown rule system'
        );
    });
});

describe('indexBattleOperations', () => {
    it('indexes operations of different bases side by side', () => {
        const index = indexBattleOperations([
            server({ a: op('dm') }),
            server({ b: op('member') }),
        ]);

        expect([...index.keys()]).toEqual(['a', 'b']);
    });

    it('accepts the same operation object in two servers', () => {
        const shared = op('dm');

        expect(() =>
            indexBattleOperations([
                server({ x: shared }),
                server({ x: shared }),
            ])
        ).not.toThrow();
    });

    it('throws when another operation with different settings takes the name', () => {
        expect(() =>
            indexBattleOperations([
                server({ x: op('dm') }),
                server({ x: op('member') }),
            ])
        ).toThrow('Duplicate battle operation: x');
    });

    it('resolves a real operation from the registry', () => {
        expect(systemBattleOperation('core-action')?.settings.access).toBe(
            'member'
        );
    });
});
