// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadSlideImage } from '@/lib/api/decks';
import { useSlideUpload } from '@/lib/hooks/show/useSlideUpload';
import { resizeImageToBlob } from '@/lib/utils/common/image-resize';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

vi.mock('@/lib/api/decks', () => ({ uploadSlideImage: vi.fn() }));

vi.mock('@/lib/utils/common/image-resize', async (importOriginal) => ({
    ...(await importOriginal<
        typeof import('@/lib/utils/common/image-resize')
    >()),
    resizeImageToBlob: vi.fn(),
}));

describe('useSlideUpload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resizeImageToBlob).mockResolvedValue(new Blob(['x']));
        vi.mocked(uploadSlideImage).mockResolvedValue('https://x/s.webp');
    });

    it('downsizes slides to 1920px at quality 0.8 before uploading', async () => {
        const { result } = renderHook(() => useSlideUpload('c1', vi.fn()));

        await act(async () => {
            await result.current.upload([new File(['a'], 'a.png')]);
        });

        expect(resizeImageToBlob).toHaveBeenCalledWith(
            expect.any(File),
            1920,
            0.8
        );
    });
});
