// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AbbreviationsInfoDialog } from '@/components/layout/AbbreviationsInfoDialog';

afterEach(cleanup);

describe('AbbreviationsInfoDialog', () => {
    it('uses translation keys', () => {
        render(<AbbreviationsInfoDialog />);

        expect(screen.getByText('gameTerms.abbreviations.srOnly')).toBeTruthy();
    });
});
