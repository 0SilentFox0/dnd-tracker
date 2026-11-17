import { afterEach, describe, expect, it, vi } from 'vitest';

import { mcpAuditLogger } from '../mcp-audit';

vi.mock('server-only', () => ({}));

afterEach(() => vi.restoreAllMocks());

describe('mcpAuditLogger', () => {
    it('logs tool, token and status without payload', () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});

        mcpAuditLogger('tok', 'camp')({
            type: 'REQUEST_COMPLETED',
            method: 'tools/call',
            parameters: { name: 'content_delete', arguments: { id: 'SECRET' } },
            result: { content: 'SECRET' },
            status: 'success',
            duration: 12,
        });

        const line = String(info.mock.calls[0][0]);

        expect(JSON.parse(line)).toEqual({
            audit: 'mcp',
            tokenId: 'tok',
            campaignId: 'camp',
            method: 'tools/call',
            tool: 'content_delete',
            status: 'success',
            durationMs: 12,
        });
        expect(line).not.toContain('SECRET');
    });

    it('ignores REQUEST_RECEIVED and logs only the error name for ERROR', () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});

        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const log = mcpAuditLogger('tok', 'camp');

        log({ type: 'REQUEST_RECEIVED', method: 'tools/call' });
        expect(info).not.toHaveBeenCalled();

        log({
            type: 'ERROR',
            severity: 'error',
            context: 'tools/call',
            error: new TypeError('SECRET detail'),
        });

        const line = String(warn.mock.calls[0][0]);

        expect(JSON.parse(line)).toMatchObject({ errorName: 'TypeError' });
        expect(line).not.toContain('SECRET');
    });
});
