import { type RefObject, useEffect, useRef, useState } from 'react';

// latches true once the element first intersects; true at once without IntersectionObserver
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
    const ref = useRef<T>(null);

    const [seen, setSeen] = useState(
        typeof IntersectionObserver === 'undefined'
    );

    useEffect(() => {
        const el = ref.current;

        if (seen || !el) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setSeen(true);
                observer.disconnect();
            }
        });

        observer.observe(el);

        return () => observer.disconnect();
    }, [seen]);

    return [ref, seen];
}
