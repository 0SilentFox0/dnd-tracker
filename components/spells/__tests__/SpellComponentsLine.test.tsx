// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SpellComponentsLine } from "@/components/spells/SpellComponentsLine";

afterEach(cleanup);

const diamond = { name: "Diamond", qty: 1, minGp: 50, consumed: true, focus: false };

describe("SpellComponentsLine", () => {
  it("shows V S M with ingredients", () => {
    const { container } = render(<SpellComponentsLine spell={{ componentFlags: { v: true, s: true, m: true }, ingredients: [diamond] }} />);

    expect(container).toHaveTextContent("V S M · Diamond");
  });

  it("shows only letters without ingredients", () => {
    const { container } = render(<SpellComponentsLine spell={{ componentFlags: { v: true, s: false, m: false }, ingredients: [] }} />);

    expect(container).toHaveTextContent(/^V$/);
  });

  it("falls back to the legacy text when flags are null", () => {
    const { container } = render(<SpellComponentsLine spell={{ componentFlags: null, components: "V, S, M (a pinch of sulfur)" }} />);

    expect(container).toHaveTextContent("V, S, M (a pinch of sulfur)");
  });

  it("renders nothing for old spells", () => {
    const { container } = render(<SpellComponentsLine spell={{ componentFlags: null, ingredients: [] }} />);

    expect(container).toBeEmptyDOMElement();
  });
});
