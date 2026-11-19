// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProfileTabs } from '../ProfileTabs';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('ProfileTabs', () => {
    it('keeps tab triggers from shrinking so the row scrolls on phones', () => {
        render(
            <ProfileTabs
                value="combat"
                onValueChange={() => undefined}
                tabs={[
                    { id: 'combat', label: 'Combat', content: null },
                    { id: 'advancement', label: 'Path', content: null },
                    { id: 'magic', label: 'Magic', content: null },
                ]}
            />
        );

        for (const name of ['Combat', 'Path', 'Magic']) {
            const classes = screen
                .getByRole('tab', { name })
                .className.split(' ');

            expect(classes).toContain('shrink-0');
            expect(classes).toContain('min-w-fit');
        }
    });
});
