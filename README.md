# `@jrumandal/catalog` — Catalog Micro-Frontend

Angular 20 micro-frontend for the multi-framework micro-frontend reference
architecture. It is a **source-only ESM package**: the shell (Vite) bundles it
together with the other micro-frontends, so this repo ships TypeScript source
directly (`main`/`types` → `src/index.ts`) rather than a pre-built bundle.

The catalog renders a product grid with category filtering, price filtering,
search, and a "scan product" action (via `@jrumandal/bridge`). It is exposed to
the shell as the **`<mf-catalog>`** web component.

> **Status:** Phase C — full faithful port of the reference catalog, with the
> Tailwind v4 + `@jrumandal/design-tokens` design system applied.

## Stack

| Concern    | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Angular 20 (standalone, `@angular/elements`)        |
| Distribution | Source-only ESM (bundled by the shell's Vite)     |
| Tests      | Vitest + jsdom                                      |
| Lint       | ESLint 9 (flat) + typescript-eslint                 |
| Types      | TypeScript 5.9                                      |
| Styling    | Tailwind v4 (via `@jrumandal/design-tokens`)           |

## Shared dependencies

This repo consumes the shared libraries from the `shared` repo:

- `@jrumandal/contracts` — typed API contracts + shared Apollo client
- `@jrumandal/design-tokens` — Tailwind v4 theme + design tokens
- `@jrumandal/event-bus` — cross-MF event bus
- `@jrumandal/bridge` — native bridge (camera scan)

In local development these resolve via the `workspace:*` protocol (see the
top-level `pnpm-workspace.yaml`). In CI, the `shared` repo is checked out as a
sibling and linked into a workspace.

## Development

```bash
pnpm install
pnpm test        # vitest
pnpm lint
pnpm typecheck
pnpm build       # no-op (source-only package)
```

## Publishing

`pnpm publish` (or the CI `publish` job) publishes `@jrumandal/catalog` to GitHub
Packages. The shell consumes it as a versioned dependency.

## Repository layout

```
catalog/
├── src/
│   ├── index.ts                  # public API
│   ├── lib/catalog.component.ts  # Angular component (mf-catalog)
│   ├── register.ts               # register() → <mf-catalog> custom element
│   ├── hydrate.ts                # hydrate() → attach eventBus/apolloClient
│   ├── ssr.ts                    # render() → SSR HTML
│   ├── register.spec.ts
│   └── ssr.spec.ts
├── scripts/publish.mjs
├── vitest.config.ts
├── eslint.config.mjs
├── tsconfig.json
└── package.json
```
