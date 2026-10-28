// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassForm } from "@/components/classes/ClassForm";
import { SubclassesEditor } from "@/components/classes/SubclassesEditor";
import { makeClass } from "@/lib/utils/characters/classes/__tests__/class-fixtures";

vi.mock("@/lib/hooks/classes", async () => {
  const { useState } = await import("react");

  return {
    useClassForm: (_c: string, _id: string, initial: unknown) => {
      const [data, set] = useState(initial);

      return { form: { data, set }, abilities: { setErrors: () => {}, valid: true, errors: [] }, actions: { submit: () => {}, cancel: () => {} }, status: { isSaving: false } };
    },
  };
});

vi.mock("@/components/classes/ClassBasicsTab", () => ({ ClassBasicsTab: () => <div>basics</div> }));
vi.mock("@/components/classes/ClassFeaturesEditor", () => ({ ClassFeaturesEditor: () => <div>features-editor</div> }));

const cls = makeClass({ id: "f", features: [{ level: 1, abilities: [], choices: [] }], subclassLevel: 3 });

describe("ClassForm map tab", () => {
  afterEach(cleanup);

  it("opens on the map and a base cell click switches to features", () => {
    render(<ClassForm campaignId="c" gameClass={cls} />);

    expect(screen.getAllByRole("row")).toHaveLength(21);

    fireEvent.click(screen.getAllByTestId("base-1")[0]);

    expect(screen.getByText("features-editor")).toBeVisible();
  });

  it("shows the SRD hint in the subclasses editor", () => {
    render(<SubclassesEditor campaignId="c" form={{ data: cls, set: () => {} }} />);

    expect(screen.getByText(/SRD містить лише один підклас/)).toBeInTheDocument();
  });
});
