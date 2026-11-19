// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { UserAvatar } from '@/components/auth/UserAvatar';

afterEach(cleanup);

const user = (over: object) => ({
    id: 'u1',
    email: 'a@x.com',
    name: null,
    avatarUrl: null,
    ...over,
});

describe('UserAvatar', () => {
    it('renders the photo when avatarUrl is set', () => {
        const { container } = render(
            <UserAvatar user={user({ avatarUrl: 'https://x/a.webp' })} />
        );

        expect(container.querySelector('img')?.getAttribute('src')).toBe(
            'https://x/a.webp'
        );
    });

    it('renders initials without a photo', () => {
        const { container } = render(
            <UserAvatar user={user({ name: 'Anna Kovalenko' })} />
        );

        expect(container.textContent).toBe('AK');
        expect(container.querySelector('img')).toBeNull();
    });

    it('renders no text for a null user', () => {
        const { container } = render(<UserAvatar user={null} />);

        expect(container.textContent).toBe('');
    });

    it('uses the same background for the same id', () => {
        const bg = () =>
            render(<UserAvatar user={user({ name: 'A B' })} />).container
                .firstElementChild?.getAttribute('style');

        const first = bg();

        expect(first).toContain('hsl(');
        expect(bg()).toBe(first);
    });
});
