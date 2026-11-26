// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BattleDetails } from '@/components/battle/setup/form/BattleFormBasicInfo';
import { SetupHeader } from '@/components/battle/setup/form/SetupHeader';

vi.mock('@/lib/hooks/common', () => ({ useIsMobile: () => false }));

afterEach(cleanup);

function Harness({ initial }: { initial: Partial<BattleDetails> }) {
    const [data, set] = useState<BattleDetails>({
        name: '',
        description: '',
        turnTimerSeconds: null,
        ...initial,
    });

    return (
        <SetupHeader details={{ data, set }} campaignId="c1" isEdit={false} />
    );
}

describe('SetupHeader', () => {
    it('required name: invalid event sets aria-invalid and shows the message', () => {
        render(<Harness initial={{}} />);

        const input = screen.getByLabelText('battleSetup.basic.name');

        expect(input.getAttribute('aria-invalid')).toBeNull();

        fireEvent.invalid(input);

        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(screen.getByRole('alert').textContent).toBe(
            'battleSetup.form.nameRequired'
        );
    });

    it('name input belongs to the form by id so native validation focuses it', () => {
        render(<Harness initial={{}} />);

        const input = screen.getByLabelText(
            'battleSetup.basic.name'
        ) as HTMLInputElement;

        expect(input.getAttribute('form')).toBe('battle-form');
        expect(input.required).toBe(true);
    });

    it('details dot appears only when description or timer is set', () => {
        const { unmount } = render(<Harness initial={{}} />);

        expect(screen.queryByTestId('details-dot')).toBeNull();
        unmount();

        render(<Harness initial={{ description: 'Ніч' }} />);

        expect(screen.getByTestId('details-dot')).toBeTruthy();
    });
});
