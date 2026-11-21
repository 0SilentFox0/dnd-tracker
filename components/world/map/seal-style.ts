export const sealStyle = (color: string) => ({
    background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 70%, white), ${color} 62%, color-mix(in srgb, ${color} 55%, black))`,
});
