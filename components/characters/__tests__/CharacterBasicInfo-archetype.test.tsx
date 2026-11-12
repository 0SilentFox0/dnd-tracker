// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CharacterBasicInfo } from '@/components/characters/basic/CharacterBasicInfo';
import { defaultCharacterFormData } from '@/lib/utils/characters/form/defaults';

vi.mock('@/components/ui/image-upload', () => ({
    ImageUpload: () => <span />,
}));

const basicInfo = {
    data: { ...defaultCharacterFormData.basicInfo, type: 'player' },
    set: vi.fn(),
};

const show = (hideArchetype?: boolean) =>
    render(
        <CharacterBasicInfo
            basicInfo={basicInfo as never}
            races={[]}
            hideArchetype={hideArchetype}
        />
    );

describe('CharacterBasicInfo archetype field', () => {
    afterEach(cleanup);

    it('is shown by default', () => {
        show();

        expect(document.getElementById('archetype')).not.toBeNull();
    });

    it('hideArchetype removes it', () => {
        show(true);

        expect(document.getElementById('archetype')).toBeNull();
    });
});
