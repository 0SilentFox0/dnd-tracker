'use client';

import { useState } from 'react';

export function useCommittedName(
    current: string,
    save: (name: string) => unknown
) {
    const [name, setName] = useState(current);

    const commitName = () => {
        const next = name.trim();

        if (!next) setName(current);
        else if (next !== current) void save(next);
    };

    return { name, setName, commitName };
}
