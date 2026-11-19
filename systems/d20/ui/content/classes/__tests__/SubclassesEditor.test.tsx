// @vitest-environment happy-dom
import { useEffect, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SUBCLASS_LEVEL } from '@/lib/constants/classes';
import { makeClass } from '@/lib/utils/characters/classes/__tests__/class-fixtures';
import { SubclassesEditor } from '@/systems/d20/ui/content/classes/SubclassesEditor';
import type { ClassFormData } from '@/types/classes';

vi.mock('@/systems/d20/ui/content/classes/ClassFeaturesEditor', () => ({
    ClassFeaturesEditor: ({
        onValidityChange,
    }: {
        onValidityChange: (ok: boolean, n: number) => void;
    }) => (
        <button type="button" onClick={() => onValidityChange(false, 2)}>
            break features
        </button>
    ),
}));
vi.mock('@/components/common/fields/ImageUpload', () => ({
    ImageUpload: () => null,
}));

let latest: ClassFormData;

function Harness({
    initial,
    onValidityChange,
}: {
    initial: ClassFormData;
    onValidityChange?: (ok: boolean, n: number) => void;
}) {
    const [data, set] = useState(initial);

    useEffect(() => {
        latest = data;
    });

    return (
        <SubclassesEditor
            campaignId="c"
            form={{ data, set }}
            onValidityChange={onValidityChange}
        />
    );
}

const mount = (
    over: Partial<ClassFormData> = {},
    onValidityChange?: (ok: boolean, n: number) => void
) =>
    render(
        <Harness
            initial={makeClass(over)}
            onValidityChange={onValidityChange}
        />
    );

describe('SubclassesEditor', () => {
    afterEach(cleanup);

    it('adding the first subclass also sets the default subclass level', () => {
        mount({ subclassLevel: null });

        fireEvent.click(
            screen.getByRole('button', { name: 'classes.subclasses.add' })
        );

        expect(latest.subclasses).toHaveLength(1);
        expect(latest.subclasses[0]).toMatchObject({ name: '', features: [] });
        expect(latest.subclassLevel).toBe(DEFAULT_SUBCLASS_LEVEL);
    });

    it('adding a subclass keeps an already chosen level', () => {
        mount({ subclassLevel: 5 });

        fireEvent.click(
            screen.getByRole('button', { name: 'classes.subclasses.add' })
        );

        expect(latest.subclassLevel).toBe(5);
    });

    it('renames a subclass and the heading follows', () => {
        mount({ subclasses: [{ id: 'a', name: '', features: [] }] });

        expect(screen.getByText('classes.subclasses.newSubclass')).toBeTruthy();

        fireEvent.change(
            screen.getByLabelText('classes.subclasses.nameLabel'),
            { target: { value: 'Champion' } }
        );

        expect(latest.subclasses[0].name).toBe('Champion');
        expect(screen.getByText('Champion')).toBeTruthy();
    });

    it('removes only the chosen subclass', () => {
        mount({
            subclasses: [
                { id: 'a', name: 'Champion', features: [] },
                { id: 'b', name: 'Battle Master', features: [] },
            ],
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: /classes\.subclasses\.remove.*Champion/,
            })
        );

        expect(latest.subclasses.map((s) => s.name)).toEqual(['Battle Master']);
    });

    it('the level field is optional: an empty value clears it', () => {
        mount({ subclassLevel: 3 });

        const input = screen.getByLabelText('classes.subclasses.levelLabel');

        fireEvent.change(input, { target: { value: '' } });
        expect(latest.subclassLevel).toBeNull();

        fireEvent.change(input, { target: { value: '7' } });
        expect(latest.subclassLevel).toBe(7);
    });

    it('reports the feature errors of subclasses upward and forgets removed ones', () => {
        const onValidity = vi.fn();

        mount(
            { subclasses: [{ id: 'a', name: 'Champion', features: [] }] },
            onValidity
        );

        fireEvent.click(screen.getByRole('button', { name: 'break features' }));
        expect(onValidity).toHaveBeenLastCalledWith(false, 2);

        fireEvent.click(
            screen.getByRole('button', {
                name: /classes\.subclasses\.remove/,
            })
        );
        expect(onValidity).toHaveBeenLastCalledWith(true, 0);
    });
});
