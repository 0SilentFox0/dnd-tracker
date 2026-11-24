import { useEffect, useRef, useState } from 'react';

export function useScrolledPast() {
    const ref = useRef<HTMLElement>(null);

    const [past, setPast] = useState(false);

    useEffect(() => {
        const el = ref.current;

        if (!el || typeof IntersectionObserver === 'undefined') return;

        const io = new IntersectionObserver(([e]) =>
            setPast(!e.isIntersecting)
        );

        io.observe(el);

        return () => io.disconnect();
    }, []);

    return { ref, past };
}
