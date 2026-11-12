export type PaletteId =
    | 'tavern'
    | 'midnight'
    | 'forest'
    | 'parchment'
    | 'amethyst'
    | 'frost';
export interface PaletteSettings {
    userId: string;
    palette: PaletteId;
}
