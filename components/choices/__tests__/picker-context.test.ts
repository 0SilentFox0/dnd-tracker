import { describe, expect, it } from 'vitest';

import { issueFor } from '@/components/choices/picker-context';
import type { ChoiceIssue } from '@/types/choices';

describe('issueFor', () => {
    it('ignores Zod issues whose path is an array', () => {
        expect(issueFor([{ path: ['name'] } as never], 'name')).toBeUndefined();
    });

    it('matches the path and its children', () => {
        const issues: ChoiceIssue[] = [
            {
                path: 'raceChoices.x.0',
                code: 'CHOICE_INCOMPLETE',
                message: 'm',
            },
        ];

        expect(issueFor(issues, 'raceChoices.x')).toBe('m');
        expect(issueFor(issues, 'raceChoices.y')).toBeUndefined();
    });
});
