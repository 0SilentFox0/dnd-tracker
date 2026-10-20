import { vi } from "vitest";

export interface RecordedCall {
  method: string;
  args: unknown[];
  /** fillStyle at call time */
  fillStyle: unknown;
}

export interface Recorder {
  calls: string[];
  blurs: number[];
  /** every method call with its arguments; gradient `addColorStop` calls included */
  args: RecordedCall[];
}

/** A 2D context that accepts every call, recording method names, arguments and each `shadowBlur` assignment. */
export function recordingContext(canvas?: HTMLCanvasElement): CanvasRenderingContext2D & { rec: Recorder } {
  const rec: Recorder = { calls: [], blurs: [], args: [] };

  const state: Record<string | symbol, unknown> = { canvas, rec, globalAlpha: 1, globalCompositeOperation: "source-over", shadowBlur: 0, lineWidth: 1 };

  return new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];

      if (typeof key !== "string") return undefined;

      return (...args: unknown[]) => {
        rec.calls.push(key);
        rec.args.push({ method: key, args, fillStyle: target.fillStyle });

        if (key.startsWith("create") && key.endsWith("Gradient")) return {
            addColorStop: (...stop: unknown[]) => {
              rec.args.push({ method: "addColorStop", args: stop, fillStyle: target.fillStyle });
            },
          };

        if (key === "createPattern") return {};

        if (key === "measureText") return { width: String(args[0] ?? "").length * 6 };

        if (key === "getTransform") return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

        return undefined;
      };
    },
    set(target, key, value) {
      if (key === "shadowBlur") rec.blurs.push(Number(value));

      target[key] = value;

      return true;
    },
  }) as unknown as CanvasRenderingContext2D & { rec: Recorder };
}

/** Every canvas created after this gets its own recording context; returns the list of contexts handed out. */
export function stubCanvasContexts() {
  const made: (CanvasRenderingContext2D & { rec: Recorder })[] = [];

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const g = recordingContext(this);

    made.push(g);

    return g as never;
  });

  return made;
}

export const isGradientCall = (name: string) => name === "createLinearGradient" || name === "createRadialGradient" || name === "createConicGradient";
