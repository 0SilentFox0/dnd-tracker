// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { StepIndicator } from '../StepIndicator';

afterEach(cleanup);

it('makes reachable steps selectable and marks the rest aria-disabled', () => {
    const onSelect = vi.fn();

    render(
        <StepIndicator
            label="l"
            steps={['a', 'b', 'c']}
            current={1}
            max={1}
            onSelect={onSelect}
        />
    );

    fireEvent.click(screen.getByRole('button', { name: /a/ }));
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(
        screen.getByText('c').closest('[aria-disabled="true"]')
    ).not.toBeNull();
});
