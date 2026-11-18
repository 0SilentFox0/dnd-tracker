import { describe, expect, it } from 'vitest';

import { legendaryLogKey } from '../../mutations/core-action/legendary-mutation';

import en from '@/messages/en/lairLog.json';

describe('legendaryLogKey', () => {
    it('keeps the plain legendary keys without a scene kind', () => {
        expect(legendaryLogKey('use', null)).toBe('battleLog.legendary.use');
        expect(legendaryLogKey('run', null)).toBe('battleLog.legendary.run');
    });

    it('writes current module keys for a scene kind', () => {
        expect(legendaryLogKey('use', 'lair')).toBe('lairLog.use');
        expect(legendaryLogKey('run', 'lair')).toBe('lairLog.run');
        expect(en).toHaveProperty('use');
        expect(en).toHaveProperty('run');
    });
});
