// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createStorageNumber, createStorageValue, useStorageValue } from "../storage-value";

afterEach(() => localStorage.clear());

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

describe("createStorageNumber", () => {
  it("читає, обрізає до 0..1 і пише в localStorage", () => {
    localStorage.setItem("vol", "2");

    const store = createStorageNumber("vol", 0.6, clamp01);

    expect(store.get()).toBe(1);

    store.set(0.25);
    expect(localStorage.getItem("vol")).toBe("0.25");
    expect(store.get()).toBe(0.25);

    store.set(3);
    expect(localStorage.getItem("vol")).toBe("1");
    expect(store.get()).toBe(1);
  });

  it("сміття в сховищі — значення за замовчуванням", () => {
    localStorage.setItem("vol2", "abc");

    expect(createStorageNumber("vol2", 0.6).get()).toBe(0.6);
  });

  it("зміна в іншій вкладці доходить через подію storage", () => {
    const store = createStorageNumber("vol3", 0.6, clamp01);

    const { result } = renderHook(() => useStorageValue(store, 0.6));

    expect(result.current).toBe(0.6);

    localStorage.setItem("vol3", "0.3");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "vol3" }));
    });

    expect(result.current).toBe(0.3);
  });
});

describe("createStorageValue", () => {
  it("власний кодек: рядковий enum зі сміттям у значення за замовчуванням", () => {
    const store = createStorageValue<"a" | "b">("mode", "a", { parse: (raw) => (raw === "b" ? "b" : "a"), serialize: (v) => v });

    localStorage.setItem("mode", "zzz");
    expect(store.get()).toBe("a");

    store.set("b");
    expect(localStorage.getItem("mode")).toBe("b");
    expect(store.get()).toBe("b");
  });
});
