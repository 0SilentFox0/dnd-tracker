/** Literal/template keys read from code that is reachable but only returns text refs rendered elsewhere. */
export const ROUTE_SCOPE_LITERAL_EXEMPT: {
    file: string;
    reason: string;
    /** the exemption does not apply to pages whose path contains this */
    exceptPage?: string;
}[] = [
    {
        file: 'lib/utils/battle/',
        reason: 'the battle engine returns log refs, rendered only in battle',
    },
    {
        file: 'lib/utils/abilities/registry/effects/hp.ts',
        reason: 'ability effects return log refs, rendered only in battle',
    },
    {
        file: 'rules/tables/defaults.ts',
        exceptPage: 'dm/rules',
        reason: 'a module\'s default table texts are rendered only by its rules Tables section',
    },
    {
        file: 'lib/utils/spells/model/schema.ts',
        reason: 'validation issue keys, translated where the form shows them',
    },
    {
        file: 'lib/utils/rules/section-shapes.ts',
        reason: 'validation issue keys, translated where the form shows them',
    },
    {
        file: 'lib/constants/api-errors.ts',
        reason: 'server error texts, translated on the server before the client sees them',
    },
];

export const isExempt = (file: string, page = '') =>
    ROUTE_SCOPE_LITERAL_EXEMPT.some(
        (e) =>
            (e.file.endsWith('/') ? file.startsWith(e.file) : file === e.file || file.endsWith(`/${e.file}`)) &&
            !(e.exceptPage && page.includes(e.exceptPage))
    );

/** Battle texts read by module UI outside battle, known gaps from before route scopes (final review M2): the module's battle namespace is battle-only. */
export const SYSTEM_READ_ALLOWED: { file: string; reason: string }[] = [
    {
        file: 'ui/battle/FortunePicker.tsx',
        reason: 'sheet roll dialog',
    },
    {
        file: 'ui/equipment/QualityListEditor.tsx',
        reason: 'artifact quality editor',
    },
];

export const isSystemReadAllowed = (ns: string, file: string) =>
    ns.startsWith('battle') &&
    SYSTEM_READ_ALLOWED.some((e) => file.endsWith(`/${e.file}`));
