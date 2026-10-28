// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";

import { offsetPager, usePager } from "../usePager";

it("clamps at both ends and slices pages", () => {
  const { result } = renderHook(() => usePager([1, 2, 3, 4, 5], 2));

  expect(result.current).toMatchObject({ page: 0, pageItems: [1, 2], pageCount: 3, canPrev: false, canNext: true });
  act(() => result.current.prev());
  expect(result.current.page).toBe(0);
  act(() => result.current.next());
  act(() => result.current.next());
  expect(result.current).toMatchObject({ page: 2, pageItems: [5], canNext: false });
  act(() => result.current.next());
  expect(result.current.page).toBe(2);
});

it("handles an empty list and shrinking items", () => {
  const { result, rerender } = renderHook(({ items }) => usePager(items, 2), { initialProps: { items: [1, 2, 3] } });

  act(() => result.current.next());
  rerender({ items: [] });
  expect(result.current).toMatchObject({ page: 0, pageItems: [], pageCount: 1, canPrev: false, canNext: false });
});

it("offsetPager steps by size and never below zero", () => {
  const seen: number[] = [];

  const pager = offsetPager(20, 20, true, (o) => seen.push(o));

  pager.prev();
  pager.next();
  expect(seen).toEqual([0, 40]);
  expect(offsetPager(0, 20, false, () => {})).toMatchObject({ canPrev: false, canNext: false });
});
