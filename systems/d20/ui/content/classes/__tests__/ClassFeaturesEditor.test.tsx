// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    listOptions,
    pickOption,
} from '@/components/ui/__tests__/radix-select';
import { ClassFeaturesEditor } from '@/systems/d20/ui/content/classes/ClassFeaturesEditor';
import type { ClassFeature } from '@/types/classes';

vi.mock('@/components/abilities', () => ({
    AbilityListEditor: ({
        value,
        withIcon,
    }: {
        value: unknown[];
        withIcon?: boolean;
    }) => (
        <div data-testid="ability-editor" data-with-icon={String(!!withIcon)}>
            {value.length}
        </div>
    ),
}));

function Harness({ initial = [] }: { initial?: ClassFeature[] }) {
    const [features, setFeatures] = useState<ClassFeature[]>(initial);

    return (
        <ClassFeaturesEditor
            campaignId="c1"
            value={features}
            onChange={setFeatures}
        />
    );
}

const headings = () =>
    screen
        .queryAllByRole('heading', {
            name: /^classes\.features\.level \{"level":\d+\}$/,
        })
        .map((h) => h.textContent);

describe('ClassFeaturesEditor', () => {
    afterEach(cleanup);

    it('вмикає поле іконки у редакторі здібностей', () => {
        render(<Harness initial={[{ level: 1, abilities: [] }]} />);

        expect(
            screen.getByTestId('ability-editor').getAttribute('data-with-icon')
        ).toBe('true');
    });

    it('додає рівень із секцією редактора здібностей', async () => {
        render(<Harness />);

        await pickOption(
            screen.getByLabelText('classes.features.levelToAdd'),
            '5'
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'classes.features.addLevel' })
        );

        expect(headings()).toEqual(['classes.features.level {"level":5}']);
        expect(screen.getAllByTestId('ability-editor')).toHaveLength(1);
    });

    it('тримає рівні відсортованими', async () => {
        render(<Harness initial={[{ level: 9, abilities: [] }]} />);

        await pickOption(
            screen.getByLabelText('classes.features.levelToAdd'),
            '2'
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'classes.features.addLevel' })
        );
        await pickOption(
            screen.getByLabelText('classes.features.levelToAdd'),
            '4'
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'classes.features.addLevel' })
        );

        const chips = Array.from(
            screen
                .getByRole('navigation', { name: 'classes.features.levelsNav' })
                .querySelectorAll('button')
        ).map((b) => b.textContent);

        expect(chips).toEqual(['2', '4', '9']);
        expect(headings()).toEqual(['classes.features.level {"level":4}']);
    });

    it('видаляє рівень', () => {
        render(
            <Harness
                initial={[
                    { level: 1, abilities: [] },
                    { level: 3, abilities: [] },
                ]}
            />
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'classes.features.removeLevel {"level":1}',
            })
        );

        expect(headings()).toEqual(['classes.features.level {"level":3}']);
    });

    it('не пропонує вже додані рівні', async () => {
        render(<Harness initial={[{ level: 1, abilities: [] }]} />);

        const options = (
            await listOptions(
                screen.getByLabelText('classes.features.levelToAdd')
            )
        ).map((o) => o.textContent);

        expect(options).not.toContain('1');
        expect(options).toHaveLength(19);
    });
});
