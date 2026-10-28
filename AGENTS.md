# AGENTS.md — ObjectStack Bridges

The single instruction set for humans and agents working in this repository.

## What this repo is

Relays between ObjectStack environments and vendor suites that do not speak a
standard protocol (DingTalk, WeCom, Feishu, ...). Read
[docs/architecture.md](docs/architecture.md) before adding a bridge.

## Rules that are not negotiable

1. **Standard protocols only toward the platform.** A bridge talks to an
   environment through OpenAPI / MCP, webhook, OIDC or SCIM, and nothing else.
   No package here imports `@objectstack/*` runtime internals. If a bridge
   needs something the platform does not expose as a standard interface, that
   is a platform card in `objectstack-ai/objectstack`, not a workaround here.
2. **Stateless toward the customer.** A customer's app key and secret arrive
   with each request (from the credential stored in their own environment) and
   are never written to disk, a database or logs. The only state a bridge keeps
   is derived and disposable: cached access tokens, keyed by a hash, never by a
   secret.
3. **Never log payloads.** Messages, directory entries and tokens are customer
   data. Log the vendor, the operation, the status and a correlation id.
4. **Every bridge runs both ways.** It must work as our hosted multi-tenant
   instance and as a single-tenant Docker image inside a customer network, from
   the same code, with configuration from environment variables only.
5. **One package per vendor; shared code goes to `bridge-kit`.** A second
   vendor needing the same thing is the signal to move it into the kit.

## Layout and commands

- `packages/bridge-kit` — shared building blocks.
- `packages/bridge-<vendor>` — one vendor each.
- `pnpm install`, `pnpm build`, `pnpm typecheck`, `pnpm test` at the root.
- Node 22+, pnpm 10, TypeScript strict, ESM, Vitest.

## Changes

- Every PR that changes a published package carries a changeset
  (`pnpm changeset`). Packages version independently.
- Tests sit next to the code (`*.test.ts`). A vendor client is tested against
  recorded vendor responses, never the live vendor API in CI.
- Commit messages: conventional commits (`feat(bridge-dingtalk): ...`).
