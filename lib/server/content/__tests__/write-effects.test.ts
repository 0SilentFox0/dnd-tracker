import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    afterContentCommit,
    currentContentWrite,
    currentTransaction,
    outsideWriteScope,
    runContentEffects,
    runContentWriteContext,
} from '../write-context';

describe('after-commit effects', () => {
    afterEach(() => vi.restoreAllMocks());

    it('runs every effect and logs failures instead of throwing', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        const ran = vi.fn();

        await expect(
            runContentEffects([
                () => {
                    throw new Error('sync');
                },
                async () => {
                    throw new Error('async');
                },
                ran,
            ])
        ).resolves.toBeUndefined();

        expect(ran).toHaveBeenCalledOnce();
        expect(error).toHaveBeenCalledTimes(2);
    });

    it('swallows a rejected effect outside a write context', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        afterContentCommit(async () => {
            throw new Error('boom');
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(error).toHaveBeenCalledOnce();
    });
});

describe('outsideWriteScope', () => {
    it('hides the inherited write context from the callback', async () => {
        const seen = await runContentWriteContext('c1', {}, async () => [
            currentContentWrite()?.campaignId,
            outsideWriteScope(() => currentContentWrite()),
            outsideWriteScope(() => currentTransaction()),
        ]);

        expect(seen).toEqual(['c1', undefined, undefined]);
    });
});
