import { readdirSync } from 'node:fs';
import path from 'node:path';

export const SCHEMA_DIR = path.resolve(__dirname, '../../prisma/schema');

export const prismaSchemaFiles = (dir = SCHEMA_DIR): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
            ? prismaSchemaFiles(path.join(dir, e.name))
            : e.name.endsWith('.prisma')
              ? [path.join(dir, e.name)]
              : []
    );
