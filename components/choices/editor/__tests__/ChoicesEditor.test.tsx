// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ChoicesEditor } from '@/components/choices/editor/ChoicesEditor';
import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    empty,
    featsById,
    refs,
    scores,
    sorcerer,
    spells,
} from '@/lib/utils/characters/choices/__tests__/fixtures';
import type { ChoicesState } from '@/types/choices';
import type { GameClassData } from '@/types/classes';

const view = { ...refs, ready: true, feats: Object.values(featsById), spells };

const kitClass: GameClassData = {
    ...sorcerer,
    id: 'cls-kit',
    features: [
        {
            level: 1,
            abilities: [],
            choices: [
                {
                    id: 'starting-equipment',
                    label: 'Starting Equipment',
                    level: 1,
                    count: 1,
                    kind: 'option',
                    atCreation: true,
                    options: [
                        {
                            id: 'a',
                            name: 'Package A',
                            abilities: [],
                            kit: { items: [], gp: 5 },
                        },
                    ],
                },
            ],
        },
    ],
};

const kitView = {
    ...view,
    classesById: { ...view.classesById, [kitClass.id]: kitClass },
};

function Harness({
    initial,
    classMode,
    level = 1,
    creation,
    refs: harnessRefs = view,
}: {
    initial: ChoicesState;
    classMode: boolean;
    level?: number;
    creation?: boolean;
    refs?: typeof view;
}) {
    const [data, set] = useState<ChoicesState>(initial);

    return (
        <>
            <ChoicesEditor
                state={{ data, set }}
                refs={harnessRefs}
                creation={creation}
                hero={{ level, scores, skills: {}, classMode }}
                issues={[
                    {
                        path: 'raceChoices.keen-senses',
                        code: 'SKILL_NOT_ALLOWED',
                        message: API_ERRORS.SKILL_NOT_ALLOWED,
                    },
                ]}
            />
            <output data-testid="json">{JSON.stringify(data)}</output>
        </>
    );
}

const json = () =>
    JSON.parse(screen.getByTestId('json').textContent ?? '{}') as ChoicesState;

describe('ChoicesEditor', () => {
    afterEach(cleanup);

    it('race section without class mode; server issue under its choice', () => {
        render(<Harness initial={empty} classMode={false} />);

        expect(
            screen.getByRole('heading', {
                name: 'choices.editor.race {"name":"Elf"}',
            })
        ).toBeTruthy();
        expect(
            screen.queryByRole('heading', { name: 'choices.editor.originFeat' })
        ).toBeNull();
        fireEvent.click(screen.getByRole('checkbox', { name: /Wood Elf/ }));

        expect(json().raceChoices).toEqual({
            'elven-lineage': [{ id: 'wood-elf' }],
        });
        expect(screen.getByText(API_ERRORS.SKILL_NOT_ALLOWED)).toBeTruthy();
    });

    it('class mode: origin feat and class sections', () => {
        render(
            <Harness
                initial={{
                    ...empty,
                    classes: [{ classId: sorcerer.id, level: 1 }],
                }}
                classMode
            />
        );

        fireEvent.click(screen.getByRole('radio', { name: /Alert/ }));

        expect(json().feats).toEqual([{ id: 'f-alert', source: 'origin' }]);
        expect(
            screen.getByRole('heading', { name: 'Sorcerer 1' })
        ).toBeTruthy();
    });

    describe('starting equipment', () => {
        const initial = {
            ...empty,
            classes: [{ classId: kitClass.id, level: 1 }],
        };

        it('only in the creation form; "No package" clears the pick', () => {
            const { unmount } = render(
                <Harness initial={initial} classMode refs={kitView} />
            );

            expect(screen.queryByText('choices.kit.title')).toBeNull();
            unmount();

            render(
                <Harness initial={initial} classMode creation refs={kitView} />
            );

            expect(screen.getByText('choices.kit.title')).toBeTruthy();
            fireEvent.click(screen.getByRole('radio', { name: /Package A/ }));
            expect(json().classes[0].choices).toEqual({
                'starting-equipment': [{ id: 'a' }],
            });

            fireEvent.click(
                screen.getByRole('button', { name: 'choices.kit.none' })
            );
            expect(json().classes[0].choices).toEqual({
                'starting-equipment': [],
            });
        });

        it('a class without the group has no section', () => {
            render(
                <Harness
                    initial={{
                        ...empty,
                        classes: [{ classId: sorcerer.id, level: 1 }],
                    }}
                    classMode
                    creation
                />
            );

            expect(screen.queryByText('choices.kit.title')).toBeNull();
        });
    });
});
