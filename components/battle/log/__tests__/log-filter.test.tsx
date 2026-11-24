// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LogFilterBar } from '../LogFilterBar';

import { render } from '@/lib/i18n/test/render-uk';
import { filterLog, type LogFilter } from '@/lib/utils/battle/view';

vi.unmock('next-intl');

afterEach(cleanup);

const entries = [
    { actionIndex: 1, actionType: 'attack', actionDetails: {} },
    { actionIndex: 2, actionType: 'end_turn', actionDetails: {} },
] as never[];

function Harness() {
    const [f, setF] = useState<LogFilter>('all');

    return (
        <>
            <LogFilterBar value={f} onChange={setF} />
            <ul>
                {filterLog(entries, f).map((e: { actionIndex: number }) => (
                    <li key={e.actionIndex}>{`entry-${e.actionIndex}`}</li>
                ))}
            </ul>
        </>
    );
}

describe('log filter', () => {
    it('system hides battle entries and battle hides system ones', () => {
        render(<Harness />);

        expect(screen.getAllByRole('listitem')).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: 'Система' }));
        expect(screen.getByText('entry-2')).toBeTruthy();
        expect(screen.queryByText('entry-1')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Бій' }));
        expect(screen.getByText('entry-1')).toBeTruthy();
        expect(screen.queryByText('entry-2')).toBeNull();
    });
});
