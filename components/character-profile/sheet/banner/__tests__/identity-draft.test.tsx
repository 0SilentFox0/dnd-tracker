// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { buildIdentityDraft, overlayIdentity } from '../build-identity-draft';
import { IdentityDraftProvider, useIdentityDraft } from '../IdentityDraft';

import type { Race } from '@/types/races';

const saved = {
    name: 'Арвен',
    race: 'Ельф',
    subrace: null,
    className: 'Воїн',
    subclass: null,
    alignment: 'True Neutral',
    avatar: null,
    level: 2,
    raceColor: '#111111',
    raceIcon: 'old.png',
};

const basic = {
    name: 'Нове',
    type: 'PLAYER',
    controlledBy: '',
    level: 5,
    class: 'Маг',
    race: 'Гном',
    alignment: '',
    avatar: '',
} as Parameters<typeof buildIdentityDraft>[0];

describe('identity draft', () => {
    afterEach(cleanup);

    it('overlay shows the typed name, level and avatar', () => {
        const draft = buildIdentityDraft(basic, { races: [], classesById: {} });

        const merged = overlayIdentity(saved, draft);

        expect(merged.name).toBe('Нове');
        expect(merged.level).toBe(5);
        expect(merged.className).toBe('Маг');
        expect(merged.alignment).toBeNull();
    });

    it('falls back to the saved race colour when the race has none', () => {
        const draft = buildIdentityDraft(basic, {
            races: [{ name: 'Гном' } as Race],
            classesById: {},
        });

        expect(overlayIdentity(saved, draft).raceColor).toBe('#111111');
    });

    it('takes colour and crest from the chosen race option', () => {
        const draft = buildIdentityDraft(basic, {
            races: [{ name: 'Гном', color: '#222222', icon: 'g.png' } as Race],
            classesById: {},
        });

        const merged = overlayIdentity(saved, draft);

        expect(merged.raceColor).toBe('#222222');
        expect(merged.raceIcon).toBe('g.png');
    });

    it('without a draft returns the saved identity', () => {
        expect(overlayIdentity(saved, null)).toBe(saved);
    });

    it('provider exposes the draft to consumers', () => {
        function Probe() {
            return <span>{useIdentityDraft()?.name ?? 'none'}</span>;
        }

        render(
            <IdentityDraftProvider
                value={buildIdentityDraft(basic, {
                    races: [],
                    classesById: {},
                })}
            >
                <Probe />
            </IdentityDraftProvider>
        );
        expect(screen.getByText('Нове')).toBeTruthy();
    });
});
