# Architecture

## Why bridges, not plugins

An ObjectStack environment can be extended with code plugins (ADR-0025), but
hosted ObjectOS Cloud runs many environments in one process and does not load
third-party code. Vendor suites such as DingTalk, WeCom and Feishu are reached
over the network anyway, so the integration is placed outside the platform: the
environment speaks a standard protocol, and a bridge translates it to the
vendor's API. One bridge then serves hosted Cloud, self-hosted and Enterprise
environments alike, and a vendor API change ships as a bridge release without
waiting for a platform release.

## The four standard interfaces

| Interface | Direction | Platform side |
| --- | --- | --- |
| OpenAPI / MCP connector | environment → bridge | the connector executors (objectstack#27293) |
| Webhook messaging channel | environment → bridge | an outbound messaging channel that posts per-recipient notifications to a URL |
| OIDC | environment ⇄ bridge | external identity provider sign-in (hosted: through the Cloud identity center) |
| SCIM | bridge → environment | SCIM provisioning; the vendor user id is the user's `externalId` |

Inbound callbacks (a button pressed in a vendor card) are delivered to the
environment as a webhook.

## A request through a bridge

1. The environment's connector app calls the bridge with the customer's app
   key and secret attached from the environment's own credential store.
2. The bridge gets an access token from `TokenCache` (`bridge-kit`), issuing
   one from the vendor only when none is cached.
3. The bridge calls the vendor API, maps the reply to the documented shape, and
   returns it. Nothing about the customer is stored.

## Deployment

- **Hosted**: one multi-tenant instance per vendor, operated by ObjectStack for
  ObjectOS Cloud. Its deployment configuration lives in the cloud repository and
  pins a released bridge version.
- **Self-hosted**: the same code as a Docker image, configured by environment
  variables, run inside the customer's network.

## Compatibility

Bridges depend only on the standard interfaces above, so one bridge release
works across platform versions. A nightly contract test against the platform's
`next` build catches a platform change that breaks one.
