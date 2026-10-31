// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassCard } from "@/components/classes/ClassCard";
import { Items } from "@/components/classes/progression/ProgressionRowView";
import { SubclassesEditor } from "@/components/classes/SubclassesEditor";
import type { ClassFormData, GameClassData } from "@/types/classes";

vi.mock("@/components/ui/image-upload", () => ({
  ImageUpload: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <>
      <button type="button" onClick={() => onChange("https://x/new.webp")}>set-icon</button>
      <button type="button" onClick={() => onChange("")}>clear-icon</button>
      <span data-testid="icon-value">{value}</span>
    </>
  ),
}));

const cls = (over: Partial<GameClassData>) => ({ id: "c1", name: "Fighter", icon: null, color: null, hitDie: 10, caster: "none", subclasses: [], ...over }) as unknown as GameClassData;

describe("class icons", () => {
  afterEach(cleanup);

  it("ClassCard shows class and subclass icons", () => {
    const { container } = render(
      <ClassCard
        gameClass={cls({ icon: "https://x/c.webp", subclasses: [{ id: "a", name: "Champion", icon: "https://x/a.webp", features: [] }, { id: "b", name: "Battle Master", icon: "https://x/b.webp", features: [] }] })}
        campaignId="c"
        onDelete={() => {}}
      />,
    );

    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(screen.getByTitle("Champion")).toBeTruthy();
    expect(screen.getByAltText("Champion")).toBeTruthy();
  });

  it("ClassCard falls back to the initial without an icon", () => {
    const { container } = render(<ClassCard gameClass={cls({})} campaignId="c" onDelete={() => {}} />);

    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.getByText("F")).toBeTruthy();
  });

  it("Items renders an icon only for items that have one", () => {
    const { container } = render(
      <Items
        items={[
          { key: "a", name: "Rage", summary: "", icon: "https://x/r.webp" },
          { key: "b", name: "Plain", summary: "" },
        ]}
      />,
    );

    const summaries = container.querySelectorAll("summary");

    expect(summaries[0].querySelector("img")).not.toBeNull();
    expect(summaries[1].querySelector("img")).toBeNull();
    expect(summaries[1].textContent).toContain("Plain");
  });

  it("SubclassesEditor shows the subclass icon or the initial", () => {
    const data = { subclassLevel: 3, columns: [], subclasses: [{ id: "a", name: "Champion", icon: "https://x/a.webp", features: [] }, { id: "b", name: "Mage", features: [] }] } as unknown as ClassFormData;

    const { container } = render(<SubclassesEditor campaignId="c" form={{ data, set: () => {} }} />);

    expect(container.querySelectorAll("h2 img")).toHaveLength(1);
    expect(container.querySelector("h2")?.textContent).toContain("Champion");
  });

  it("SubclassesEditor edits and clears the subclass icon", () => {
    const set = vi.fn();

    const data = { subclassLevel: 3, columns: [], subclasses: [{ id: "a", name: "Champion", icon: "https://x/a.webp", features: [] }] } as unknown as ClassFormData;

    render(<SubclassesEditor campaignId="c" form={{ data, set }} />);

    expect(screen.getByTestId("icon-value").textContent).toBe("https://x/a.webp");

    const apply = (button: string) => {
      set.mockClear();
      fireEvent.click(screen.getByText(button));

      return set.mock.calls[0][0](data).subclasses[0].icon;
    };

    expect(apply("set-icon")).toBe("https://x/new.webp");
    expect(apply("clear-icon")).toBeNull();
  });
});
