// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PuzzlePreview } from '../PuzzlePreview';

import type { PuzzleSpec } from '@/types/show';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

vi.mock('@/lib/utils/puzzle/generate', () => ({ generatePuzzle: () => [] }));

const spec = { imageWidth: 100, imageHeight: 50 } as PuzzleSpec;

describe('PuzzlePreview', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllEnvs();
    });

    it('draws the slide through the media host when it is configured', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
        vi.stubEnv('NEXT_PUBLIC_MEDIA_BASE_URL', 'https://media.example.dev');

        const { container } = render(
            <PuzzlePreview
                spec={spec}
                imageUrl="https://proj.supabase.co/storage/v1/object/public/scene-slides/c/a.webp"
            />
        );

        expect(container.querySelector('image')?.getAttribute('href')).toBe(
            'https://media.example.dev/storage/v1/object/public/scene-slides/c/a.webp'
        );
    });
});
