import { moduleMetaOf, type SystemSelection } from "./catalog";
import { type Addon, type AddonBuilder, composeCached, compositionOrder, type DeepPartial } from "./compose";

export type ModuleEntry<T> = T | AddonBuilder<T>;

export interface ModuleSource<T extends object> {
  entries: Readonly<Record<string, ModuleEntry<T>>>;
  /** A module without an entry in this layer contributes nothing */
  optional?: boolean;
  compose: (base: T, addons: readonly Addon<T>[]) => T;
}

const isBuilder = <T>(entry: ModuleEntry<T>): entry is AddonBuilder<T> => typeof entry === "function";

export function resolveSystem<T extends object>(system: SystemSelection, cache: Map<string, T>, source: ModuleSource<T>): T {
  return composeCached(cache, system, ({ base, modules }) => {
    const entry = Object.hasOwn(source.entries, base) ? source.entries[base] : undefined;

    const baseDef = entry && !isBuilder(entry) ? entry : undefined;

    if (!baseDef) throw new Error(`No definition for base module: ${base}`);

    const addons = compositionOrder(base, modules).map((id): Addon<T> => {
      const built = Object.hasOwn(source.entries, id) ? source.entries[id] : undefined;

      if (!built && source.optional) return { id, claims: moduleMetaOf(id)?.claims, build: () => ({}) as DeepPartial<T> };

      if (!built || !isBuilder(built)) throw new Error(`No definition for module: ${id}`);

      return { id, claims: moduleMetaOf(id)?.claims, build: built };
    });

    return source.compose(baseDef, addons);
  });
}
