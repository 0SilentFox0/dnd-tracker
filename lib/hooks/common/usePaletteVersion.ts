import { useEffect, useState } from 'react';

export function usePaletteVersion() {
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const observer = new MutationObserver(() => setVersion((v) => v + 1));

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-palette'],
        });

        return () => observer.disconnect();
    }, []);

    return version;
}
