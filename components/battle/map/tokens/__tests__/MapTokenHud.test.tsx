// @vitest-environment happy-dom
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fx = vi.hoisted(() => ({ userEnabled: true, motionAllowed: true }));

vi.mock('@/lib/hooks/battle/useFxEnabled', () => ({
    useFxEnabled: () => ({
        enabled: fx.userEnabled && fx.motionAllowed,
        ...fx,
        setEnabled: vi.fn(),
    }),
}));

import { MapTokenHud } from '@/components/battle/map/tokens/MapTokenHud';
import { render } from '@/lib/i18n/test/render-uk';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import type { ActiveEffect } from '@/types/battle';

vi.unmock('next-intl');

const base = createMockParticipant();

const unit = (hp: number, size = 1) => ({
    ...base,
    basicInfo: { ...base.basicInfo, id: 'u', name: 'Огр' },
    combatStats: {
        ...base.combatStats,
        currentHp: hp,
        maxHp: 40,
        gridSize: size,
    },
});

const effect = (
    name: string,
    fxElement: string,
    extra: Partial<ActiveEffect> = {}
) =>
    ({
        id: name,
        name,
        type: 'debuff',
        duration: 2,
        permanent: false,
        appliedAt: { round: 1, timestamp: new Date(0) },
        effects: [],
        fxElement,
        ...extra,
    }) as unknown as ActiveEffect;

const hud = (
    over: {
        hp?: number;
        size?: number;
        exact?: boolean;
        effects?: ActiveEffect[];
        px?: number;
        hovered?: boolean;
        onReturn?: () => void;
    } = {}
) =>
    render(
        <MapTokenHud
            participant={unit(over.hp ?? 30, over.size)}
            placement={{
                grid: 'square',
                box: { cx: 50, cy: 50, size: 100 * (over.size ?? 1) },
                mapSize: { width: 1000, height: 1000 },
                pxPerUnit: over.px ?? 0.8,
                hovered: over.hovered,
            }}
            exact={over.exact ?? true}
            raised={false}
            effects={over.effects}
            onReturn={over.onReturn}
        />
    );

const q = (c: HTMLElement, sel: string) =>
    c.querySelector<HTMLElement>(sel) as HTMLElement;

afterEach(() => {
    cleanup();
    fx.userEnabled = true;
    fx.motionAllowed = true;
});

describe('MapTokenHud bar', () => {
    it('заливка й слід на частку HP, тон за порогами, без тексту й імені', () => {
        const { container } = hud({ hp: 30 });

        const bar = q(container, '[data-map-hud-bar]');

        expect(q(bar, '[data-map-hud-fill]').style.width).toBe('75%');
        expect(q(bar, '[data-map-hud-trail]').style.width).toBe('75%');
        expect(bar.dataset.hpTone).toBe('high');
        expect(parseFloat(bar.style.height)).toBeLessThanOrEqual(5);
        expect(container.textContent).toBe('');
        expect(container.querySelector('[data-map-hud-name]')).toBeNull();
    });

    it.each([
        [15, 'mid'],
        [8, 'low'],
    ])('HP %i → тон %s', (hp, tone) => {
        const { container } = hud({ hp });

        expect(q(container, '[data-map-hud-bar]').dataset.hpTone).toBe(tone);
    });

    it('не exact: ширина за сегментами', () => {
        const { container } = hud({ hp: 15, exact: false });

        expect(q(container, '[data-map-hud-fill]').style.width).toBe('50%');
    });

    it('товщина смуги росте з масштабом, але лишається тонкою', () => {
        const thin = parseFloat(
            q(hud({ px: 0.3 }).container, '[data-map-hud-bar]').style.height
        );

        const thick = parseFloat(
            q(hud({ size: 2, px: 1.5 }).container, '[data-map-hud-bar]').style
                .height
        );

        expect(thin).toBeLessThanOrEqual(thick);
        expect(thick).toBeLessThanOrEqual(5);
    });
});

describe('MapTokenHud hover tip', () => {
    it("exact: при наведенні — ім'я й cur/max", () => {
        const { container } = hud({ hp: 30, hovered: true });

        const tip = q(container, '[data-map-hud-tip]');

        expect(q(tip, '[data-map-hud-name]').textContent).toBe('Огр');
        expect(q(tip, '[data-map-hud-value]').textContent).toBe('30/40');
        expect(tip.className).not.toContain('pointer-events-auto');
    });

    it('не exact: при наведенні — мітка стану без чисел', () => {
        const { container } = hud({ hp: 15, exact: false, hovered: true });

        expect(q(container, '[data-map-hud-value]').textContent).toBe(
            'закривавлений'
        );
        expect(q(container, '[data-map-hud-tip]').textContent).not.toMatch(
            /\d/
        );
    });

    it('без наведення підказки немає', () => {
        const { container } = hud({ hp: 30 });

        expect(container.querySelector('[data-map-hud-tip]')).toBeNull();
    });
});

describe('MapTokenHud fit', () => {
    it('дрібна клітинка — HUD прибраний повністю, щоб не закривати жетон', () => {
        const { container } = hud({ px: 0.15 });

        expect(container.firstChild).toBeNull();
    });

    it('дрібна клітинка з кнопкою повернення — кнопка лишається, смуги немає', () => {
        const { container } = hud({ px: 0.15, onReturn: vi.fn() });

        expect(container.querySelector('[data-map-return]')).not.toBeNull();
        expect(container.querySelector('[data-map-hud-strip]')).toBeNull();
    });
});

describe('MapTokenHud status motifs', () => {
    const motifs = (c: HTMLElement) =>
        [...c.querySelectorAll<HTMLElement>('[data-hud-fx]')].map(
            (e) => e.dataset.hudFx
        );

    it('мороз → крижана рамка й мотив', () => {
        const { container } = hud({ effects: [effect('Холод', 'cold')] });

        expect(q(container, '[data-map-hud-strip]').dataset.hudRim).toBe(
            'frost'
        );
        expect(motifs(container)).toEqual(['frost']);
    });

    it('горіння → вогонь', () => {
        const { container } = hud({ effects: [effect('Підпал', 'fire')] });

        expect(q(container, '[data-map-hud-strip]').dataset.hudRim).toBe(
            'fire'
        );
    });

    it('кілька ефектів — два найпріоритетніші, рамка від першого', () => {
        const { container } = hud({
            effects: [
                effect('Отрута', 'poison'),
                effect('Холод', 'cold'),
                {
                    ...effect('Оглушення', ''),
                    type: 'condition',
                    effects: [{ type: 'skip_action', value: 1 }],
                } as ActiveEffect,
            ],
        });

        expect(motifs(container)).toEqual(['stun', 'plague']);
        expect(q(container, '[data-map-hud-strip]').dataset.hudRim).toBe(
            'stun'
        );
    });

    it('зменшений рух — відтінок лишається, анімації немає', () => {
        fx.motionAllowed = false;

        const { container } = hud({ effects: [effect('Холод', 'cold')] });

        const strip = q(container, '[data-map-hud-strip]');

        expect(strip.dataset.hudRim).toBe('frost');
        expect(strip.className).not.toContain('map-hud-anim');
    });

    it('з рухом — клас анімації є', () => {
        const { container } = hud({ effects: [effect('Холод', 'cold')] });

        expect(q(container, '[data-map-hud-strip]').className).toContain(
            'map-hud-anim'
        );
    });

    it('FX вимкнені користувачем — без мотивів', () => {
        fx.userEnabled = false;

        const { container } = hud({ effects: [effect('Холод', 'cold')] });

        expect(
            q(container, '[data-map-hud-strip]').dataset.hudRim
        ).toBeUndefined();
        expect(motifs(container)).toEqual([]);
    });
});
