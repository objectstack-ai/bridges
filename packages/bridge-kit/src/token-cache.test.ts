import { describe, expect, it, vi } from 'vitest';
import { TokenCache } from './token-cache.js';

describe('TokenCache', () => {
    it('reuses a token until the refresh window, then re-issues', async () => {
        let now = 0;
        const cache = new TokenCache({ refreshSkewMs: 60_000, now: () => now });
        const issue = vi.fn(async () => ({ token: `t${issue.mock.calls.length}`, expiresInSeconds: 7200 }));

        expect(await cache.get('app', issue)).toBe('t1');
        now = 7200_000 - 60_001;
        expect(await cache.get('app', issue)).toBe('t1');
        now = 7200_000 - 60_000;
        expect(await cache.get('app', issue)).toBe('t2');
        expect(issue).toHaveBeenCalledTimes(2);
    });

    it('shares one in-flight issue across concurrent callers', async () => {
        const cache = new TokenCache();
        let release!: () => void;
        const gate = new Promise<void>((r) => { release = r; });
        const issue = vi.fn(async () => { await gate; return { token: 'shared', expiresInSeconds: 7200 }; });

        const calls = Promise.all([cache.get('app', issue), cache.get('app', issue), cache.get('app', issue)]);
        release();
        expect(await calls).toEqual(['shared', 'shared', 'shared']);
        expect(issue).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failure', async () => {
        const cache = new TokenCache();
        const issue = vi.fn()
            .mockRejectedValueOnce(new Error('vendor down'))
            .mockResolvedValueOnce({ token: 'ok', expiresInSeconds: 7200 });

        await expect(cache.get('app', issue)).rejects.toThrow('vendor down');
        expect(await cache.get('app', issue)).toBe('ok');
    });

    it('keeps keys apart and honours invalidate', async () => {
        const cache = new TokenCache();
        const a = vi.fn(async () => ({ token: 'a', expiresInSeconds: 7200 }));
        const b = vi.fn(async () => ({ token: 'b', expiresInSeconds: 7200 }));

        expect(await cache.get('corp-a', a)).toBe('a');
        expect(await cache.get('corp-b', b)).toBe('b');
        cache.invalidate('corp-a');
        await cache.get('corp-a', a);
        expect(a).toHaveBeenCalledTimes(2);
        expect(b).toHaveBeenCalledTimes(1);
    });

    it('does not cache a token whose lifetime is inside the skew', async () => {
        const cache = new TokenCache({ refreshSkewMs: 300_000 });
        const issue = vi.fn(async () => ({ token: 'short', expiresInSeconds: 60 }));

        await cache.get('app', issue);
        await cache.get('app', issue);
        expect(issue).toHaveBeenCalledTimes(2);
    });
});
