import { beforeEach, describe, expect, it, vi } from 'vitest';

import DMMapEditorPage from '../[mapId]/page';
import DMMapsPage from '../page';

import { requireMapLibrary } from '@/lib/server/campaigns/access';

vi.mock('../page-client', () => ({ MapsPageClient: () => null }));
vi.mock('../[mapId]/page-client', () => ({ MapEditorPageClient: () => null }));
vi.mock('@/lib/server/campaigns/access', () => ({
    requireMapLibrary: vi.fn(),
}));

describe('DM maps pages', () => {
    beforeEach(() => vi.mocked(requireMapLibrary).mockReset());

    it('list page passes the campaign id after the guard', async () => {
        const el = (await DMMapsPage({
            params: Promise.resolve({ id: 'c1' }),
        })) as { props: unknown };

        expect(requireMapLibrary).toHaveBeenCalledWith('c1');
        expect(el.props).toEqual({ campaignId: 'c1' });
    });

    it('editor page passes ids after the guard', async () => {
        const el = (await DMMapEditorPage({
            params: Promise.resolve({ id: 'c1', mapId: 'm1' }),
        })) as { props: unknown };

        expect(requireMapLibrary).toHaveBeenCalledWith('c1');
        expect(el.props).toEqual({ campaignId: 'c1', mapId: 'm1' });
    });
});
