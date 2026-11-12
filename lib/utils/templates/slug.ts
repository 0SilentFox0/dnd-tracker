export const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

export const isSlug = (s: string): boolean => SLUG_RE.test(s);

export function slugify(name: string): string {
    const slug = name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!slug) throw new Error(`Cannot derive a slug from "${name}"`);

    return slug;
}
