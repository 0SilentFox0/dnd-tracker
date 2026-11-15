// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFxBadgeLabels } from '../use-badge-labels';

import { IntlWrapper } from '@/lib/i18n/test/intl-wrapper';
import { textRef } from '@/lib/i18n/text-ref';

vi.unmock('next-intl');

const wrapper = ({ children }: { children: ReactNode }) => (
    <IntlWrapper locale="en">{children}</IntlWrapper>
);

describe('useFxBadgeLabels', () => {
    it('uses the neutral core text without a module', () => {
        const { result } = renderHook(() => useFxBadgeLabels(), { wrapper });

        expect(result.current.raincloud).toBe('-2');
        expect(result.current.rust).toBe('-2 AC');
    });

    it('takes the module text from fx.badges', () => {
        const { result } = renderHook(
            () =>
                useFxBadgeLabels({
                    badges: {
                        raincloud: textRef('battleMorale.fxBadge', {
                            value: 2,
                        }),
                    },
                }),
            { wrapper }
        );

        expect(result.current.raincloud).toBe('-2 morale');
        expect(result.current.rust).toBe('-2 AC');
    });
});
