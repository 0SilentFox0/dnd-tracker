import { useState } from "react";

export type PagerControls = { page: number; canPrev: boolean; canNext: boolean; prev: () => void; next: () => void };

export type Pager<T> = PagerControls & { pageItems: T[]; pageCount: number };

export function usePager<T>(items: T[], size: number): Pager<T> {
  const [requested, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(items.length / size));

  const page = Math.min(requested, pageCount - 1);

  return {
    page,
    pageCount,
    pageItems: items.slice(page * size, (page + 1) * size),
    canPrev: page > 0,
    canNext: page + 1 < pageCount,
    prev: () => setPage(Math.max(0, page - 1)),
    next: () => setPage(Math.min(pageCount - 1, page + 1)),
  };
}

export function offsetPager(offset: number, size: number, hasMore: boolean, setOffset: (offset: number) => void): PagerControls {
  return { page: Math.floor(offset / size), canPrev: offset > 0, canNext: hasMore, prev: () => setOffset(Math.max(0, offset - size)), next: () => setOffset(offset + size) };
}
