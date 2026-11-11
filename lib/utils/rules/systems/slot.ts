export type SystemData = Record<string, unknown>;

export interface SystemSlot {
  key: string;
  data: unknown;
}

export interface SlotCodec<T> {
  key: string;
  read(slot: SystemSlot | undefined | null): T | undefined;
  write(data: T): SystemSlot;
}

export const defineSlot = <T>(key: string, parse: (raw: unknown) => T | undefined): SlotCodec<T> => ({
  key,
  read: (slot) => (slot?.key === key ? parse(slot.data) : undefined),
  write: (data) => ({ key, data }),
});
