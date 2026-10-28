import { COMPENDIUM_LIMITS, type JsonRecord } from "@/lib/server/compendium-import/parse";
export function readCompendiumFile(file: File, signal?: AbortSignal): Promise<JsonRecord> {
  if (file.size > COMPENDIUM_LIMITS.bytes) return Promise.reject(new Error("FILE_SIZE: максимум 3 MiB; виберіть менший файл"));

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./file.worker.ts", import.meta.url));

    const finish = (error?: string, root?: JsonRecord) => {
      clearTimeout(timer); worker.terminate(); signal?.removeEventListener("abort", cancel);

      if (error) reject(new Error(error)); else resolve(root!);
    };

    const cancel = () => finish("CANCELLED");

    const timer = setTimeout(() => finish("PARSING_TIMEOUT: виберіть менший файл"), 5000);

    worker.onmessage = (e: MessageEvent<{ root?: JsonRecord; error?: string }>) => finish(e.data.error, e.data.root);
    worker.onerror = () => finish("INVALID_JSON");
    signal?.addEventListener("abort", cancel, { once: true });

    if (signal?.aborted) cancel(); else worker.postMessage(file);
  });
}
