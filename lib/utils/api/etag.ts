export const weakEtag = (...parts: (string | number)[]): string =>
    `W/"${parts.join('-')}"`;

const strip = (tag: string) => tag.trim().replace(/^W\//, '');

/** 304 response when the request's If-None-Match matches; otherwise null. */
export function ifNoneMatch(req: Request, etag: string): Response | null {
    const header = req.headers.get('if-none-match');

    if (!header) return null;

    const matches =
        header.trim() === '*' ||
        header.split(',').some((tag) => strip(tag) === strip(etag));

    return matches
        ? new Response(null, { status: 304, headers: { ETag: etag } })
        : null;
}
