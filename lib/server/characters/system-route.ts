import { CHARACTER_OPERATIONS } from './operations/registry';
import { characterRoute } from './operation-runner';

export const systemCharacterRoute =
    (name: string): ReturnType<typeof characterRoute> =>
    async (request, context, actor) => {
        const operation = CHARACTER_OPERATIONS[name];

        if (!operation) throw new Error(`Unknown character operation: ${name}`);

        return characterRoute(operation)(request, context, actor);
    };
