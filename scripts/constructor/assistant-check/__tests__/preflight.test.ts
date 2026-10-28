import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { assistantCheckPreflight, browserSources } from "../preflight";

describe("assistant check preflight", () => {
  it("sourcesAreTrackedAndOutputsAreSeparate", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "assistant-preflight-"));

    const chrome = path.join(dir, "chrome");

    writeFileSync(chrome, "#!/bin/sh\nexit 0\n");
    chmodSync(chrome, 0o700);

    const options = assistantCheckPreflight(["--output-dir", path.join(dir, "evidence"), "--chrome-path", chrome]);

    expect(options).toEqual({ outputRoot: path.join(dir, "evidence"), chromePath: chrome });
    expect(browserSources.server).not.toContain(".superpowers");
    expect(() => assistantCheckPreflight(["--output-dir", path.dirname(browserSources.server), "--chrome-path", chrome])).toThrow("ASSISTANT_OUTPUT_OVERLAPS_SOURCES");
  });

  it("fails closed for missing/non-executable Chrome and malformed options before DB or process spawn", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "assistant-preflight-"));

    const notExecutable = path.join(dir, "chrome");

    writeFileSync(notExecutable, "not a browser");
    chmodSync(notExecutable, 0o600);

    for (const args of [["--chrome-path", path.join(dir, "missing")], ["--chrome-path", notExecutable], ["--chrome-path", dir]]) {
      expect(() => assistantCheckPreflight(args)).toThrow("ASSISTANT_CHROME_UNAVAILABLE");
    }
    for (const args of [["--chrome-path"], ["--output-dir"], ["--unknown", "value"], ["--chrome-path", "--output-dir"]]) {
      expect(() => assistantCheckPreflight(args)).toThrow("ASSISTANT_INVALID_OPTIONS");
    }
  });
});
