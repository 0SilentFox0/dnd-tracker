// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SelectField } from '@/components/ui/select-field';

describe('SelectField', () => {
    afterEach(cleanup);

    it('default placeholder is the common.ui.selectPlaceholder key', () => {
        render(
            <SelectField
                value=""
                onValueChange={() => {}}
                options={[{ value: 'a', label: 'A' }]}
            />
        );

        expect(screen.getByText('common.ui.selectPlaceholder')).toBeTruthy();
    });

    it('maps the none sentinel back to an empty string', () => {
        const onValueChange = vi.fn();

        render(
            <SelectField
                value="a"
                onValueChange={onValueChange}
                allowNone
                noneLabel="None"
                options={[{ value: 'a', label: 'A' }]}
            />
        );
        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
        fireEvent.click(screen.getByRole('option', { name: 'None' }));

        expect(onValueChange).toHaveBeenCalledWith('');
    });
});
