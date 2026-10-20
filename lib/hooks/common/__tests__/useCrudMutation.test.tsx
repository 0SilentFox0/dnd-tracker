// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCrudMutation } from "@/lib/hooks/common/useCrudMutation";

const KEY = ["sheet", "c1"] as const;

function setup(awaitInvalidation: boolean) {
  const client = new QueryClient();

  let release: () => void = () => {};

  let fetches = 0;

  const queryFn = () => {
    fetches += 1;

    return fetches === 1 ? Promise.resolve("old") : new Promise<string>((resolve) => (release = () => resolve("fresh")));
  };

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  const hook = renderHook(
    () => ({
      query: useQuery({ queryKey: KEY, queryFn }),
      mutation: useCrudMutation({ mutationFn: async () => "ok", invalidateKeys: [KEY], awaitInvalidation }),
    }),
    { wrapper },
  );

  return { client, hook, release: () => release() };
}

describe("useCrudMutation", () => {
  it("awaitInvalidation: mutateAsync resolves after the invalidated query refetched", async () => {
    const { client, hook, release } = setup(true);

    await act(async () => {
      await client.refetchQueries({ queryKey: KEY });
    });

    let done = false;

    const pending = hook.result.current.mutation.mutateAsync().then(() => (done = true));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(done).toBe(false);

    await act(async () => {
      release();
      await pending;
    });
    expect(client.getQueryData(KEY)).toBe("fresh");
  });

  it("without it mutateAsync does not wait for the refetch", async () => {
    const { client, hook } = setup(false);

    await act(async () => {
      await client.refetchQueries({ queryKey: KEY });
    });

    await act(async () => {
      await hook.result.current.mutation.mutateAsync();
    });
    expect(client.getQueryData(KEY)).toBe("old");
  });
});
