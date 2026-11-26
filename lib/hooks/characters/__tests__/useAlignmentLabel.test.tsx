// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { loadMessages } from '@/lib/i18n/messages';

vi.unmock('next-intl');
vi.unmock('@/lib/i18n/use-translator');

import { useAlignmentLabel } from '@/lib/hooks/characters/useAlignmentLabel';

const wrapperFor = async (locale: 'uk' | 'en') => {
    const { NextIntlClientProvider } =
        await vi.importActual<typeof import('next-intl')>('next-intl');

    const messages = await loadMessages(locale, ['gameTerms']);

    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <NextIntlClientProvider locale={locale} messages={messages}>
                {children}
            </NextIntlClientProvider>
        );
    };
};

describe('useAlignmentLabel', () => {
    it('translates canonical values', async () => {
        const wrapper = await wrapperFor('uk');

        const { result } = renderHook(() => useAlignmentLabel(), { wrapper });

        await waitFor(() =>
            expect(result.current('Chaotic Evil')).toBe('Хаотично-злий')
        );
        expect(result.current('True Neutral', 'short')).toBe('Н');
    });

    it('uses english names in en', async () => {
        const wrapper = await wrapperFor('en');

        const { result } = renderHook(() => useAlignmentLabel(), { wrapper });

        expect(result.current('lawful good', 'short')).toBe('LG');
    });

    it('falls back to the raw string and empty for null', async () => {
        const wrapper = await wrapperFor('uk');

        const { result } = renderHook(() => useAlignmentLabel(), { wrapper });

        expect(result.current('any alignment')).toBe('any alignment');
        expect(result.current(null)).toBe('');
    });
});
