export type BuildStep = { cmd: string; env?: Record<string, string>; timeoutMs?: number };

export function buildSteps(env: Record<string, string | undefined>): BuildStep[];

export function assertBuildEnv(env: Record<string, string | undefined>): void;
