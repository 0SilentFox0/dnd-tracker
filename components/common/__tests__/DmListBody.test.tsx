// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DmListBody } from "@/components/common/DmListBody";

afterEach(cleanup);

const renderBody = (isLoading: boolean, isEmpty: boolean) =>
  render(
    <DmListBody isLoading={isLoading} isEmpty={isEmpty} loadingLabel="Loading" empty={<p>Nothing</p>}>
      <p>Items</p>
    </DmListBody>,
  );

describe("DmListBody", () => {
  it("shows the loading state while empty and loading", () => {
    renderBody(true, true);

    expect(screen.queryByText("Nothing")).toBeNull();
    expect(screen.queryByText("Items")).toBeNull();
  });

  it("shows the empty state when loaded and empty", () => {
    renderBody(false, true);

    expect(screen.getByText("Nothing")).toBeTruthy();
  });

  it("shows children when there are items", () => {
    renderBody(false, false);

    expect(screen.getByText("Items")).toBeTruthy();
  });
});
