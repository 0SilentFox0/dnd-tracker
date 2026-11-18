import { describe, expect, it } from 'vitest';

import { DEFAULT_RULES } from './fixtures/default-rules';
import frozen from './fixtures/default-rules.frozen.json';

describe('DEFAULT_RULES fixture', () => {
    it('deep-equals the frozen pre-module defaults', () => {
        expect(JSON.parse(JSON.stringify(DEFAULT_RULES))).toEqual(frozen);
    });
});
