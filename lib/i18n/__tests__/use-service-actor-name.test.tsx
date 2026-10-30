// @vitest-environment happy-dom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { useServiceActorName } from "@/lib/i18n/use-service-actor-name";

vi.unmock("next-intl");

afterEach(cleanup);

function Probe() {
  const name = useServiceActorName();

  return <span>{[name("system"), name("dm"), String(name("hero-1"))].join("|")}</span>;
}

describe("useServiceActorName", () => {
  it("локалізує системного актора і ДМ, для решти — null", async () => {
    const { container } = await renderWithIntl(<Probe />, { locale: "en", namespaces: ["battleCommon"] });

    expect(container.textContent).toBe("System|DM|null");
  });
});
