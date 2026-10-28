// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Access-token cache for vendor APIs that trade an app key + secret for a
 * short-lived token (DingTalk, WeCom and Feishu all do, each with its own
 * endpoint and expiry field).
 *
 * The bridge is stateless toward the customer: the credential arrives with the
 * request and is never stored. The only thing kept is the derived token, in
 * memory, keyed by a caller-supplied key (typically a hash of the app key, never
 * the secret itself), and dropped `refreshSkewMs` before the vendor says it
 * expires.
 *
 * Concurrent callers for the same key share one in-flight fetch, so a burst of
 * requests after expiry costs the vendor one token call, not N (vendors
 * rate-limit the token endpoint far more tightly than the business APIs).
 */

export interface IssuedToken {
    /** The access token the vendor returned. */
    token: string;
    /** Lifetime in seconds, as the vendor reported it. */
    expiresInSeconds: number;
}

export interface TokenCacheOptions {
    /** Drop a token this long before its reported expiry. Default 5 minutes. */
    refreshSkewMs?: number;
    /** Injectable clock for tests. */
    now?: () => number;
}

interface Entry {
    token: string;
    expiresAt: number;
}

export class TokenCache {
    private readonly entries = new Map<string, Entry>();
    private readonly inflight = new Map<string, Promise<string>>();
    private readonly refreshSkewMs: number;
    private readonly now: () => number;

    constructor(options: TokenCacheOptions = {}) {
        this.refreshSkewMs = options.refreshSkewMs ?? 5 * 60_000;
        this.now = options.now ?? Date.now;
    }

    /**
     * Return a live token for `key`, calling `issue` only when none is cached
     * or the cached one is inside the refresh window. A failed `issue` is not
     * cached: the next call tries again.
     */
    async get(key: string, issue: () => Promise<IssuedToken>): Promise<string> {
        const cached = this.entries.get(key);
        if (cached && cached.expiresAt > this.now()) return cached.token;

        const pending = this.inflight.get(key);
        if (pending) return pending;

        const fetching = (async () => {
            try {
                const issued = await issue();
                const lifetimeMs = issued.expiresInSeconds * 1000 - this.refreshSkewMs;
                // A lifetime shorter than the skew is used for this call only.
                if (lifetimeMs > 0) {
                    this.entries.set(key, { token: issued.token, expiresAt: this.now() + lifetimeMs });
                } else {
                    this.entries.delete(key);
                }
                return issued.token;
            } finally {
                this.inflight.delete(key);
            }
        })();
        this.inflight.set(key, fetching);
        return fetching;
    }

    /** Forget the token for `key`, e.g. after the vendor rejected it as invalid. */
    invalidate(key: string): void {
        this.entries.delete(key);
    }
}
