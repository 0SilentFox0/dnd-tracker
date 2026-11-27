// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HeroPortrait } from '@/components/character-profile/hero/HeroPortrait';

describe('HeroPortrait', () => {
    afterEach(cleanup);

    it('фото з кнопкою перегляду', () => {
        render(
            <HeroPortrait
                src="https://x.supabase.co/storage/v1/object/public/avatars/c/a.webp"
                name="Арвен"
            />
        );
        expect(
            screen.getByRole('button', {
                name: 'characterProfile.portrait.open',
            })
        ).toBeTruthy();
        expect(screen.getByAltText('Арвен')).toBeTruthy();
    });

    it('старий data URL теж рендериться', () => {
        render(
            <HeroPortrait
                src="data:image/png;base64,iVBORw0KGgo="
                name="Арвен"
            />
        );
        expect(screen.getByAltText('Арвен')).toBeTruthy();
    });

    it('без фото — перша літера', () => {
        render(<HeroPortrait src={null} name="Арвен" />);
        expect(screen.getByText('А')).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('без фото підказка «Додати фото» лише тому, хто може редагувати', () => {
        const { rerender } = render(<HeroPortrait src={null} name="Арвен" />);

        expect(screen.queryByText('characterProfile.portrait.add')).toBeNull();
        rerender(<HeroPortrait src={null} name="Арвен" canEdit />);
        expect(screen.getByText('characterProfile.portrait.add')).toBeTruthy();
    });

    it('portrait-less card uses class icon and 128px area', () => {
        const { container } = render(
            <HeroPortrait
                src={null}
                name="Арвен"
                variant="card"
                classVisual={{ icon: '⚔', color: '#aa3333' }}
            />
        );

        const area = container.querySelector(
            '[data-slot="portrait-card-fallback"]'
        ) as HTMLElement;

        expect(area.className).toContain('h-32');
        expect(area.style.getPropertyValue('--class-color')).toBe('#aa3333');
        expect(area.className).toContain('color-mix');
        expect(screen.getByText('⚔')).toBeTruthy();
        expect(screen.queryByText('А')).toBeNull();
    });

    it('falls back to monogram without class', () => {
        render(<HeroPortrait src={null} name="Арвен" variant="card" />);
        expect(screen.getByText('А')).toBeTruthy();
    });
});
