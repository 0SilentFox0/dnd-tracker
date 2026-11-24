import type { ComponentProps } from 'react';

import { GameShellClient } from '@/components/layout/GameShellClient';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';

// campaign pages replace the root messages, so the header's "What's new" needs its own namespace
export function GameShell(props: ComponentProps<typeof GameShellClient>) {
    return (
        <ExtendLocaleScope namespaces={['whatsNew']}>
            <GameShellClient {...props} />
        </ExtendLocaleScope>
    );
}
