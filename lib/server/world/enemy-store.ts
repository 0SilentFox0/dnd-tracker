import { prisma } from '@/lib/db';
import type { WorldEnemyPin } from '@/types/world';

type EnemyRow = {
    id: string;
    mapId: string;
    name: string;
    icon: string | null;
    color: string | null;
    dmNote: string | null;
    x: number;
    y: number;
};

export const toEnemyPin = (row: EnemyRow): WorldEnemyPin => ({
    id: row.id,
    mapId: row.mapId,
    name: row.name,
    icon: row.icon,
    color: row.color,
    dmNote: row.dmNote,
    x: row.x,
    y: row.y,
});

export const listEnemies = async (mapId: string): Promise<WorldEnemyPin[]> =>
    (
        await prisma.worldEnemyPin.findMany({
            where: { mapId },
            orderBy: { createdAt: 'asc' },
        })
    ).map(toEnemyPin);
