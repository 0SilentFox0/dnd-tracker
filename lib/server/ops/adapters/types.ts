export type ProviderReading = { metric: string; value: number };

export type ProviderAdapter = {
    name: string;
    collect(): Promise<ProviderReading[] | 'unavailable'>;
};
