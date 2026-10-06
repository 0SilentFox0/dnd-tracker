// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PortalContainerProvider } from "@/components/ui/portal-container";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function Harness() {
  const [el, setEl] = useState<HTMLElement | null>(null);

  return (
    <div ref={setEl} data-testid="host">
      <PortalContainerProvider value={el}>
        <Select open value="a">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="a">Альфа</SelectItem></SelectContent>
        </Select>
      </PortalContainerProvider>
    </div>
  );
}

afterEach(cleanup);

describe("PortalContainerProvider", () => {
  it("renders select content inside the provided container", () => {
    render(<Harness />);

    const host = screen.getByTestId("host");

    expect(host.querySelector('[data-slot="select-content"]')).not.toBeNull();
  });
});
