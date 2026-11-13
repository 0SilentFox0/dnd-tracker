import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { Translator } from '@/lib/i18n/translator';

let operationPreview: typeof import('@/lib/server/assistant/actions/content-operation-preview').operationPreview;

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
    ({ operationPreview } = await import(
        '@/lib/server/assistant/actions/content-operation-preview'
    ));
}, 30_000);

const t = ((key: string) => key) as unknown as Translator;

const state = { campaign: { rules: { system: { key: 'dnd5e' } } }, tables: {} };

const preview = (body: unknown) =>
    operationPreview('rules.update', { body }, t, state);

describe('rules.update preview with modules', () => {
    it('rejects an invalid module set like the execution does', () => {
        expect(() => preview({ system: { modules: ['zzz'] } })).toThrowError(
            expect.objectContaining({
                message: API_ERRORS.SYSTEM_MODULES_INVALID,
                status: 422,
            })
        );
    });

    it('warns when a setup module changes heroes, not for a free one', () => {
        expect(
            preview({ system: { modules: ['heroscaling'] } })?.warnings
        ).toEqual(['warnings.moduleSetup']);
        expect(preview({ system: { modules: ['morale'] } })?.warnings).toEqual(
            []
        );
    });

    it('drops confirm from the previewed changes', () => {
        const result = preview({
            system: { modules: ['morale'] },
            confirm: true,
        });

        const text = JSON.stringify(result?.changes);

        expect(text).not.toContain('confirm');
        expect(text).toContain('morale');
    });
});
