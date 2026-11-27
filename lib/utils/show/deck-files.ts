import type { Slide } from '@/types/show';

export function removedSlideUrls(
    before: Pick<Slide, 'imageUrl'>[],
    after: Pick<Slide, 'imageUrl'>[],
    keep: Iterable<string>
): string[] {
    const kept = new Set([...after.map((s) => s.imageUrl), ...keep]);

    return [...new Set(before.map((s) => s.imageUrl))].filter(
        (url) => !kept.has(url)
    );
}

const ICON_TYPES = new Set(['image/x-icon', 'image/vnd.microsoft.icon']);

export function isUnsupportedSlideFile(
    file: Pick<File, 'name' | 'type'>
): boolean {
    if (ICON_TYPES.has(file.type) || /\.ico$/i.test(file.name)) return true;

    return file.type !== '' && !file.type.startsWith('image/');
}
