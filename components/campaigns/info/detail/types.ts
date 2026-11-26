export interface ReferenceDetailProps<T> {
    campaignId: string;
    item: T;
    isDM: boolean;
}

export interface ReadOnlyDetailProps<T> {
    item: T;
    campaignId?: string;
    isDM?: boolean;
}
