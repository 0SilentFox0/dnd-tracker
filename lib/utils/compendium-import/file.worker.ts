/// <reference lib="webworker" />
import { parseCompendium } from "@/lib/server/compendium-import/parse";
self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(await event.data.arrayBuffer());

    self.postMessage({ root: parseCompendium(text, { checkRecordSize: false }) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error && "code" in error ? String(error.code) : "INVALID_JSON_UTF8" });
  }
};
