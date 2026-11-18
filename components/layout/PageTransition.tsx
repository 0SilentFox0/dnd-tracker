'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
    children: React.ReactNode;
}

/** Radix Select's hideOthers() sets aria-hidden on this div; with focus still inside, the browser blocks the dropdown, so we strip it while focus is within. */
export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname();

    const ref = useRef<HTMLDivElement>(null);

    const lastPathname = useRef(pathname);

    useEffect(() => {
        const el = ref.current;

        if (!el) return;

        const observer = new MutationObserver(() => {
            const active = document.activeElement;

            if (
                el.getAttribute('aria-hidden') === 'true' &&
                active &&
                el.contains(active)
            ) {
                el.removeAttribute('aria-hidden');
                el.removeAttribute('data-aria-hidden');
            }
        });

        observer.observe(el, {
            attributes: true,
            attributeFilter: ['aria-hidden', 'data-aria-hidden'],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const el = ref.current;

        if (!el || lastPathname.current === pathname) return;

        lastPathname.current = pathname;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
    }, [pathname]);

    return (
        <div ref={ref} className="page-transition">
            {children}
        </div>
    );
}
