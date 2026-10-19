// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { createStorageNumber } from "../storage-number";

afterEach(() => localStorage.clear());

describe("createStorageNumber", () => {
  it("читає, обрізає до 0..1 і пише в localStorage", () => {
    localStorage.setItem("vol", "2");

    const store = createStorageNumber("vol", 0.6, (v) => Math.min(1, Math.max(0, v)));

    expect(store.get()).toBe(1);

    store.set(0.25);
    expect(localStorage.getItem("vol")).toBe("0.25");
    expect(store.get()).toBe(0.25);
  });

  it("сміття в сховищі — значення за замовчуванням", () => {
    localStorage.setItem("vol2", "abc");

    expect(createStorageNumber("vol2", 0.6).get()).toBe(0.6);
  });
});
