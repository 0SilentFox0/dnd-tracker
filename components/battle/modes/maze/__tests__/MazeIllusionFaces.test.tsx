// @vitest-environment happy-dom
import { type ReactNode } from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MazeViewProvider } from '../MazeViewProvider';

import { EffectIcon } from '@/components/battle/hud';
import {
    ParticipantFacesContext,
    useParticipantFacesValue,
} from '@/lib/hooks/battle';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';
import { mazeMap } from '@/lib/utils/battle/modes/maze/__tests__/fixtures';
import type { ActiveEffect } from '@/types/battle';

vi.unmock('next-intl');

afterEach(cleanup);

describe('іконка ефекту під маскою підміни', () => {
    it("alt портрета джерела — маска, а не справжнє ім'я партнера", () => {
        const map = mazeMap(
            {
                illusionSwap: {
                    pairs: [
                        {
                            a: 'me',
                            b: 'ally',
                            aSees: { name: 'Вампір', avatar: '/v.png' },
                            bSees: { name: 'Верховний лич' },
                        },
                    ],
                },
            },
            8,
            6
        );

        const s = fakeScene({ playerView: true, map });

        s.ally.basicInfo.avatar = '/godric.png';
        s.me.battleData.position = { x: 0, y: 0 };
        s.me.battleData.facing = 'e';
        s.ally.battleData.position = { x: 1, y: 0 };
        s.gob.battleData.position = { x: 0, y: 5 };

        const Faces = ({ children }: { children: ReactNode }) => (
            <ParticipantFacesContext.Provider
                value={useParticipantFacesValue(s.battle.initiativeOrder)}
            >
                {children}
            </ParticipantFacesContext.Provider>
        );

        const Wrapper = ({ children }: { children: ReactNode }) => (
            <s.wrapper>
                <Faces>
                    <MazeViewProvider>{children}</MazeViewProvider>
                </Faces>
            </s.wrapper>
        );

        const effect = {
            id: 'e',
            name: 'Haste',
            type: 'buff',
            effects: [],
            source: { participantId: 'ally', name: 'Годрік', personal: true },
        } as unknown as ActiveEffect;

        render(<EffectIcon effect={effect} size={20} />, { wrapper: Wrapper });

        expect(screen.queryByAltText('Годрік')).toBeNull();
        expect(screen.getByAltText('Вампір')).toBeTruthy();
    });
});
