// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SkillTreeTransferButtons } from '@/systems/skilltrees/ui/content/skill-tree/SkillTreeTransferButtons';

const transfer = vi.hoisted(() => ({
    ready: true,
    busy: false,
    actions: { importFile: vi.fn(), exportAll: vi.fn() },
}));

vi.mock('@/systems/skilltrees/hooks', () => ({
    useSkillTreeTransfer: () => transfer,
}));

describe('SkillTreeTransferButtons', () => {
    afterEach(() => {
        cleanup();
        transfer.ready = true;
        transfer.busy = false;
        vi.clearAllMocks();
    });

    it('export triggers exportAll', () => {
        render(<SkillTreeTransferButtons campaignId="c1" />);

        fireEvent.click(
            screen.getByRole('button', { name: /skillTree.transfer.export/ })
        );

        expect(transfer.actions.exportAll).toHaveBeenCalledTimes(1);
    });

    it('a chosen file is passed to importFile', () => {
        render(<SkillTreeTransferButtons campaignId="c1" />);

        const file = new File(['{}'], 'trees.json', {
            type: 'application/json',
        });

        fireEvent.change(
            screen.getByLabelText('skillTree.transfer.fileLabel'),
            {
                target: { files: [file] },
            }
        );

        expect(transfer.actions.importFile).toHaveBeenCalledWith(file);
    });

    it('both actions are disabled until the data is ready; import also while busy', () => {
        transfer.ready = false;

        const { unmount } = render(
            <SkillTreeTransferButtons campaignId="c1" />
        );

        expect(
            screen.getByRole('button', { name: /skillTree.transfer.export/ })
        ).toBeDisabled();
        expect(
            screen.getByLabelText('skillTree.transfer.fileLabel')
        ).toBeDisabled();
        unmount();

        transfer.ready = true;
        transfer.busy = true;
        render(<SkillTreeTransferButtons campaignId="c1" />);

        expect(
            screen.getByRole('button', { name: /skillTree.transfer.export/ })
        ).not.toBeDisabled();
        expect(
            screen.getByLabelText('skillTree.transfer.fileLabel')
        ).toBeDisabled();
    });
});
