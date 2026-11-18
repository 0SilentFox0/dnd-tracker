import { useState } from 'react';

export function useCompendiumSelection(invalidate: () => void) {
    const [categories, setCategories] = useState<string[]>([]),
        [excludedChapters, setExcludedChapters] = useState<string[]>([]);

    const toggleCategory = (kind: string, on: boolean) => {
        setCategories(
            on
                ? [...categories, kind]
                : categories.filter((item) => item !== kind)
        );
        invalidate();
    };

    const selectCategories = (kinds: string[]) => {
        setCategories(kinds);
        invalidate();
    };

    const setChapterExclusions = (paths: string[]) => {
        setExcludedChapters(paths);
        invalidate();
    };

    const toggleChapter = (path: string, on: boolean) => {
        setExcludedChapters(
            on
                ? excludedChapters.filter((item) => item !== path)
                : [...excludedChapters, path]
        );
        invalidate();
    };

    return {
        categories,
        excludedChapters,
        setCategories,
        setExcludedChapters,
        toggleCategory,
        selectCategories,
        toggleChapter,
        setChapterExclusions,
    };
}
