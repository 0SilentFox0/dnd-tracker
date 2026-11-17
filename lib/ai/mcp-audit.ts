import 'server-only';

type McpAuditEvent = {
    type: string;
    method?: string;
    parameters?: unknown;
    status?: string;
    duration?: number;
    severity?: string;
    context?: string;
    error?: unknown;
};

const toolNameOf = (event: McpAuditEvent) => {
    const name = (event.parameters as { name?: unknown } | undefined)?.name;

    return event.method === 'tools/call' && typeof name === 'string'
        ? name.slice(0, 100)
        : undefined;
};

/** Structured audit line per completed request; never logs parameters or results. */
export function mcpAuditLogger(tokenId: string, campaignId: string) {
    return (event: McpAuditEvent): void => {
        if (event.type === 'REQUEST_COMPLETED')
            console.info(
                JSON.stringify({
                    audit: 'mcp',
                    tokenId,
                    campaignId,
                    method: event.method,
                    tool: toolNameOf(event),
                    status: event.status,
                    durationMs: event.duration,
                })
            );
        else if (event.type === 'ERROR')
            console.warn(
                JSON.stringify({
                    audit: 'mcp',
                    tokenId,
                    campaignId,
                    status: 'error',
                    severity: event.severity,
                    context: event.context,
                    errorName:
                        event.error instanceof Error
                            ? event.error.name
                            : undefined,
                })
            );
    };
}
