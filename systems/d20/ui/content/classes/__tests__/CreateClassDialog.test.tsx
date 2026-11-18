// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { CreateClassDialog } from '@/systems/d20/ui/content/classes/CreateClassDialog';

const setup = () => {
    const onCreateClass = vi.fn();

    const onOpenChange = vi.fn();

    render(
        <CreateClassDialog
            open
            onOpenChange={onOpenChange}
            onCreateClass={onCreateClass}
        />
    );

    return {
        onCreateClass,
        onOpenChange,
        input: screen.getByLabelText('classes.create.nameLabel'),
        submit: screen.getByRole('button', { name: 'classes.create.submit' }),
    };
};

describe('CreateClassDialog', () => {
    beforeEach(() => mockMatchMedia(false));

    afterEach(cleanup);

    it('submit stays disabled until the name has non-blank text', () => {
        const { input, submit } = setup();

        expect(submit).toBeDisabled();

        fireEvent.change(input, { target: { value: '   ' } });
        expect(submit).toBeDisabled();

        fireEvent.change(input, { target: { value: 'Paladin' } });
        expect(submit).toBeEnabled();
    });

    it('submitting creates an empty class with the trimmed name', () => {
        const { input, onCreateClass } = setup();

        fireEvent.change(input, { target: { value: '  Paladin ' } });
        fireEvent.submit(input.closest('form') as HTMLFormElement);

        expect(onCreateClass).toHaveBeenCalledTimes(1);
        expect(onCreateClass).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Paladin',
                hitDie: 8,
                caster: 'none',
                features: [],
                subclasses: [],
                subclassLevel: null,
            })
        );
    });

    it('clears the field after submit', () => {
        const { input } = setup();

        fireEvent.change(input, { target: { value: 'Paladin' } });
        fireEvent.submit(input.closest('form') as HTMLFormElement);

        expect(input).toHaveValue('');
    });

    it('cancel closes the dialog without creating', () => {
        const { onOpenChange, onCreateClass } = setup();

        fireEvent.click(
            screen.getByRole('button', { name: 'common.actions.cancel' })
        );

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onCreateClass).not.toHaveBeenCalled();
    });
});
