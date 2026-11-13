// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BiographyEditor } from '@/components/character-profile/BiographyEditor';
import { LevelUpAction } from '@/components/character-profile/LevelUpAction';

describe('редактор ДМа', () => {
    afterEach(cleanup);

    it('Маркер обгортає виділене', () => {
        const onChange = vi.fn();

        render(
            <BiographyEditor value="мати загинула тут" onChange={onChange} />
        );

        const area = screen.getByRole('textbox', {
            name: 'characterProfile.biography.field',
        }) as HTMLTextAreaElement;

        area.setSelectionRange(0, 13);
        fireEvent.click(
            screen.getByRole('button', {
                name: 'characterProfile.biography.marker',
            })
        );
        expect(onChange).toHaveBeenCalledWith('==мати загинула== тут');
    });

    it('«+ рівень» немає на maxLevel і є нижче', () => {
        const { rerender } = render(
            <LevelUpAction level={20} maxLevel={20} onLevelUp={vi.fn()} />
        );

        expect(
            screen.queryByRole('button', {
                name: 'characterProfile.levelUp.action',
            })
        ).toBeNull();
        rerender(
            <LevelUpAction level={19} maxLevel={20} onLevelUp={vi.fn()} />
        );
        expect(
            screen.getByRole('button', {
                name: 'characterProfile.levelUp.action',
            })
        ).toBeTruthy();
    });
});
