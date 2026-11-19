import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'CritNest',
        short_name: 'CritNest',
        description: 'Dungeon Master companion for D&D 5e campaigns',
        start_url: '/',
        display: 'standalone',
        background_color: '#131b23',
        theme_color: '#131b23',
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
                src: '/icons/maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
