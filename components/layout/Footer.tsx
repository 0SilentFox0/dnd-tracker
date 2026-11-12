'use client';

import { LocaleSwitcher } from '@/components/common/LocaleSwitcher';
import { PaletteSwitcher } from '@/components/common/PaletteSwitcher';

export function Footer() {
    return (
        <footer className="sticky bottom-0 z-30 flex items-center justify-end gap-2 border-t border-hud-rule bg-hud-page/90 px-4 py-3 print:hidden">
            <PaletteSwitcher />
            <LocaleSwitcher />
        </footer>
    );
}
