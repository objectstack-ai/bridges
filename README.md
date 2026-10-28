# ObjectStack Bridges

Stateless relays that put vendor-specific suites — DingTalk, WeCom (企业微信),
Feishu (飞书) and the like — behind the **standard protocols** an ObjectStack
environment already speaks. The platform never runs vendor code: it talks
OpenAPI / MCP, webhook, OIDC and SCIM, and a bridge translates each of those
to one vendor's private API.

| Need | Standard side (what the environment uses) | Bridge side |
| --- | --- | --- |
| Actions — send a work notice, create a to-do, read the directory | OpenAPI / MCP connector app | Calls the vendor API, reshapes requests and replies |
| Per-person notifications | Outbound webhook messaging channel | Delivers to the person's vendor account |
| Sign-in (QR login, in-app silent login) | OIDC provider | Wraps the vendor's OAuth / auth-code flow |
| Directory and user mapping | SCIM client into the environment | Reads the vendor directory; vendor user id → `externalId` |
| Callbacks — a button pressed in a vendor card | Inbound webhook into the environment | Verifies and decrypts the vendor callback, forwards it |

See [docs/architecture.md](docs/architecture.md) for the design and the rules
every bridge follows.

## Layout

```
packages/
  bridge-kit/        shared building blocks (token cache today)
  bridge-<vendor>/   one package per vendor, added as each is built
```

Each package is versioned and released on its own. A bridge ships two ways:
the multi-tenant instance ObjectStack hosts for ObjectOS Cloud, and a Docker
image a self-hosted or Enterprise customer runs inside their own network.

## Develop

```bash
pnpm install
pnpm build
pnpm test
```

Node 22+, pnpm 10.

## License

Apache-2.0
