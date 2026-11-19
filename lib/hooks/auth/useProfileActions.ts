'use client';

import { useSwitchGoogleAccount } from './useGoogleOAuth';

export function useProfileActions() {
    const switchGoogle = useSwitchGoogleAccount();

    return {
        switchAccount: () => void switchGoogle.start(),
        signOut: () => {
            const form = document.createElement('form');

            form.method = 'post';
            form.action = '/auth/signout';
            form.hidden = true;
            document.body.appendChild(form);
            form.submit();
        },
    };
}
