export type PaletteId = 'tavern' | 'parchment';
export interface PaletteSettings {
    userId: string;
    palette: PaletteId;
}
