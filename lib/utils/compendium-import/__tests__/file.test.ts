// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";

import { readCompendiumFile } from "../file";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it("rejects oversize files before starting a worker", async () => {
 const worker = vi.fn();

 vi.stubGlobal("Worker", worker);
 await expect(readCompendiumFile({ size: 3 * 1024 * 1024 + 1 } as File)).rejects.toThrow("FILE_SIZE");
 expect(worker).not.toHaveBeenCalled();
});
it("times out at five seconds and terminates the worker", async () => {
 vi.useFakeTimers();

 const terminate = vi.fn();

 vi.stubGlobal("Worker", class { terminate = terminate; postMessage = vi.fn(); });

 const pending = expect(readCompendiumFile(new File(["{}"], "s.json"))).rejects.toThrow("PARSING_TIMEOUT");

 await vi.advanceTimersByTimeAsync(5000); await pending;
 expect(terminate).toHaveBeenCalledOnce();
});
it("cancels parsing and terminates the worker", async () => {
 const terminate = vi.fn();

 vi.stubGlobal("Worker", class { terminate = terminate; postMessage = vi.fn(); });

 const abort = new AbortController();

 const pending = expect(readCompendiumFile(new File(["{}"], "s.json"), abort.signal)).rejects.toThrow("CANCELLED");

 abort.abort(); await pending; expect(terminate).toHaveBeenCalledOnce();
});
