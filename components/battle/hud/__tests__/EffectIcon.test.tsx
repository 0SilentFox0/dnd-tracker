// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EffectIcon } from '../EffectIcon';

import type { ActiveEffect } from '@/types/battle';

vi.mock('next/image', () => ({
    default: ({ src, alt }: { src: string; alt: string }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} />
    ),
}));

vi.mock('@/lib/hooks/battle', () => ({
    useParticipantFace: () => ({
        name: 'Zehir',
        avatar: 'https://proj.supabase.co/storage/v1/object/public/avatars/c/a.webp',
    }),
}));

vi.mock('@/components/battle/use-system-battle-ui', () => ({
    useSystemUiIcon: (key: string) =>
        key === 'bleeding'
            ? (props: { className?: string }) => (
                  <svg data-testid="glyph" className={props.className} />
              )
            : undefined,
}));

const effect = {
    source: { participantId: 'p1', personal: true },
} as unknown as ActiveEffect;

describe('EffectIcon', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllEnvs();
    });

    it('renders the caster avatar through the media host when configured', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
        vi.stubEnv('NEXT_PUBLIC_MEDIA_BASE_URL', 'https://media.example.dev');

        const { getByAltText } = render(
            <EffectIcon effect={effect} size={20} />
        );

        expect(getByAltText('Zehir').getAttribute('src')).toBe(
            'https://media.example.dev/storage/v1/object/public/avatars/c/a.webp'
        );
    });

    it('resolves a ui:<key> icon through the system glyph slot', () => {
        const { getByTestId } = render(
            <EffectIcon
                effect={{ icon: 'ui:bleeding' } as unknown as ActiveEffect}
                size={20}
            />
        );

        expect(getByTestId('glyph')).toBeTruthy();
    });
});
