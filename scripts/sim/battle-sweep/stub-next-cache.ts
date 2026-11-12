import Module from 'node:module';

const loader = Module as unknown as {
    _load: (request: string, ...rest: unknown[]) => unknown;
};

const load = loader._load;

// Outside Next, unstable_cache has no incrementalCache and throws; the sweep reads straight from the DB.
loader._load = function (request, ...rest) {
    return request === 'next/cache'
        ? {
              unstable_cache: (fn: unknown) => fn,
              revalidateTag: () => undefined,
              revalidatePath: () => undefined,
          }
        : load.call(this, request, ...rest);
};
