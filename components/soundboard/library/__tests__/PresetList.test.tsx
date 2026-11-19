// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PresetList } from '../PresetList';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { SoundPreset } from '@/types/soundboard';

const mocks = vi.hoisted(() => ({
    create: vi.fn().mockResolvedValue({ id: 'new' }),
    reorder: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/hooks/soundboard', () => ({
    usePresetMutations: () => ({
        create: { mutateAsync: mocks.create, isPending: false },
        remove: { mutateOk: vi.fn() },
        reorder: { mutateOk: mocks.reorder },
    }),
}));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useConfirm: () => vi.fn().mockResolvedValue(true),
}));

vi.unmock('next-intl');

const presets: SoundPreset[] = ['A', 'B'].map((name, i) => ({
    id: `p${i}`,
    name,
    slots: Array(9).fill(null),
    sortOrder: i,
}));

describe('PresetList', () => {
    afterEach(cleanup);

    it('creates a preset and selects it', async () => {
        const onSelect = vi.fn();

        await renderWithIntl(
            <PresetList
                presets={presets}
                selectedId="p0"
                onSelect={onSelect}
            />,
            { locale: 'en', namespaces: ['common', 'soundboard'] }
        );

        fireEvent.change(screen.getByLabelText('New preset'), {
            target: { value: 'Tavern' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));

        await waitFor(() => expect(onSelect).toHaveBeenCalledWith('new'));
        expect(mocks.create).toHaveBeenCalledWith('Tavern');
    });

    it('reorders with the arrow buttons', async () => {
        await renderWithIntl(
            <PresetList presets={presets} selectedId="p0" onSelect={vi.fn()} />,
            { locale: 'en', namespaces: ['common', 'soundboard'] }
        );

        fireEvent.click(screen.getByRole('button', { name: 'Move A down' }));

        expect(mocks.reorder).toHaveBeenCalledWith(['p1', 'p0']);
    });
});
