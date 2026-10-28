# Changesets

Each bridge package is versioned on its own (no `fixed` group): a vendor API
change ships one package, not the whole repository. Add one with
`pnpm changeset` in every PR that changes a published package.
