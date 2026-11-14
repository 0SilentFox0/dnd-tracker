import type { SystemSelection } from './catalog';

type Preloader = (system: SystemSelection) => Promise<void>;

let preloader: Preloader | undefined;

/** The browser install layer registers itself here so lib code can await a composition before it becomes visible */
export const setSystemPreloader = (fn: Preloader): void => {
    preloader = fn;
};

export const preloadSystem = (system: SystemSelection): Promise<void> =>
    preloader ? preloader(system).catch(() => undefined) : Promise.resolve();
