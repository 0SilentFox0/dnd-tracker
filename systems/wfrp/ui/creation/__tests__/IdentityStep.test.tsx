// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IdentityStep } from '../IdentityStep';

vi.mock('@/components/ui/image-upload', () => ({ ImageUpload: () => null }));

afterEach(cleanup);

const form = {
    step: { total: 5 },
    preview: null,
    identity: { values: { name: 'Hans' }, set: vi.fn() },
} as never;

describe('IdentityStep', () => {
    it('has no alignment select for a system without alignments', () => {
        render(<IdentityStep form={form} />);

        expect(
            screen.queryByText('wfrpCreation.identity.alignment')
        ).toBeNull();
        expect(
            screen.getByLabelText(/wfrpCreation.identity.name/)
        ).toBeTruthy();
    });
});
