// @vitest-environment happy-dom
import { useTranslations } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { makeT } from "../test/mock-t";
import { renderWithIntl } from "../test/render-with-intl";

function Probe() {
  const t = useTranslations("common");

  return <span>{t("app.name")}</span>;
}

describe("makeT", () => {
  it("prefixes namespace, serializes params, has() is true", () => {
    const t = makeT("auth");

    expect(t("signIn.title")).toBe("auth.signIn.title");
    expect(t("n", { n: 1 })).toBe('auth.n {"n":1}');
    expect(makeT()("a.b")).toBe("a.b");
    expect(t.has("x")).toBe(true);
  });

  it("rich and markup behave like t and drop tag callbacks", () => {
    const t = makeT("auth") as unknown as { rich: (k: string, v?: Record<string, unknown>) => string; markup: (k: string, v?: Record<string, unknown>) => string };

    expect(t.rich("a", { n: 2, b: () => "x" })).toBe('auth.a {"n":2}');
    expect(t.markup("a")).toBe("auth.a");
  });
});

describe("global mock vs renderWithIntl", () => {
  it("global mock returns the namespaced key", async () => {
    const { render } = await import("@testing-library/react");

    const { container } = render(<Probe />);

    expect(container.textContent).toBe("common.app.name");
  });

  it("renderWithIntl renders real messages", async () => {
    vi.doUnmock("next-intl");

    const { container } = await renderWithIntl(<span>x</span>);

    expect(container.textContent).toBe("x");
  });
});
