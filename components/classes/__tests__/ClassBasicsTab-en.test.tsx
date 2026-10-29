// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassBasicsTab } from "@/components/classes/ClassBasicsTab";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { makeClass } from "@/lib/utils/characters/classes/__tests__/class-fixtures";

vi.unmock("next-intl");
vi.mock("@/components/classes/SpellListHint", () => ({ SpellListHint: () => null }));
vi.mock("@/components/ui/image-upload", () => ({ ImageUpload: ({ label }: { label: string }) => <span>{label}</span> }));

describe("ClassBasicsTab in en", () => {
  afterEach(cleanup);

  it("renders English labels, caster types and skills", async () => {
    const data = makeClass({ caster: "half", skillChoices: { count: 2, from: ["stealth"] } });

    await renderWithIntl(<ClassBasicsTab form={{ data, set: () => {} }} />, { locale: "en", namespaces: ["common", "gameTerms", "classes"] });

    expect(screen.getByText("Class name *")).toBeInTheDocument();
    expect(screen.getByText("Class icon")).toBeInTheDocument();
    expect(screen.getByText("Hit die")).toBeInTheDocument();
    expect(screen.getByText("Stealth")).toBeInTheDocument();
    expect(screen.getByText("Half caster")).toBeInTheDocument();
  });
});
