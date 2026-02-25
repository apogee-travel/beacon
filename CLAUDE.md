# CLAUDE.md — Beacon Monorepo

## Project Overview

Beacon is a MobX-based state management library built around composable middleware. The monorepo publishes several `@apogeelabs/*` packages: a core store (`beacon`), browser storage persistence (`beacon-browserstorage`), React utilities (`beacon-react-utils`), and two experimental PoC packages (`beacon-reactquery`, `beacon-actorstore`). See `DEVELOP.md` for full setup and workflow docs.

## Monorepo Layout

```
packages/
  beacon/                  # Core: createStore, compose, types
  beacon-browserstorage/   # Middleware: localStorage/sessionStorage persistence
  beacon-react-utils/      # React hook: useStoreWatcher
  beacon-reactquery/       # PoC: TanStack React Query integration
  beacon-actorstore/       # PoC: xstate actor model extension
examples/
  react-web-basic/         # Vite React example app
  actor-store/             # CLI todo app (beacon + xstate)
```

## Tech Stack

| Tool                  | Role                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| **MobX 6**            | Reactive state engine — `observable`, `computed`, `action`, `reaction` |
| **TypeScript**        | `strict: true`, target `es2020`, module `esnext`                       |
| **tsup**              | Builds each package to CJS + ESM with `.d.ts` declarations             |
| **Jest + ts-jest**    | Unit testing, per-package `jest.config.js`                             |
| **Turborepo**         | Task orchestration — `build`, `test`, `lint`, `dev` pipelines          |
| **pnpm 8**            | Package manager with workspace support                                 |
| **Changesets**        | Version management and npm publishing                                  |
| **ESLint + Prettier** | Linting (root `.eslintrc.js`) and formatting                           |

## Common Commands

```bash
pnpm install              # Install all dependencies
pnpm build                # Build all packages (turbo, respects dependency order)
pnpm test                 # Run all tests
pnpm lint                 # Lint all packages
pnpm format               # Prettier on all .ts/.tsx/.md files
pnpm dev                  # Watch mode for all packages
pnpm changeset            # Create a changeset for version bumping
pnpm version-packages     # Apply changesets to bump versions
pnpm release              # Build + publish to npm
```

Per-package: `cd packages/<name>` then `pnpm test`, `pnpm test:watch`, `pnpm build`, `pnpm dev`.

## Package Dependency Graph

```
beacon-react-utils  ──> beacon
beacon-browserstorage ──> beacon
beacon-reactquery ──> beacon, @tanstack/react-query
beacon-actorstore ──> beacon, xstate
```

All packages depend on `mobx` as a direct dependency. Workspace references use `"workspace:*"`.

## Coding Conventions

### Store Structure

A store is created via `createStore(config)` where config has:

- `initialState` — plain object, becomes MobX `observable`
- `derived` — optional object of `(state) => value` functions, become MobX `computed`
- `actions` — optional object of `(state, ...args) => void` functions, wrapped in MobX `action`
- `onStoreCreated` — optional lifecycle hook, called with the store instance after creation

The returned store instance exposes state properties directly, plus `actions`, `getStateSnapshot()`, `registerCleanup()`, `dispose()`, and `isDisposed`.

### Middleware Pattern

Middleware follows a curried function signature:

```typescript
(options: TOptions) => (config: StoreConfig) => StoreConfig;
```

The outer function takes middleware-specific options. The inner function receives the store config, transforms it (mutating or spreading), and returns it. Middleware can:

- Modify `initialState` (e.g., hydrate from storage)
- Add/wrap `actions`
- Add `derived` properties
- Chain `onStoreCreated` by preserving the original callback

Middleware is composed with `compose(mw1(opts1), mw2(opts2))` which applies them left-to-right via `reduce`.

### Naming Conventions

- Package names: `@apogeelabs/beacon-*`
- Source files: `camelCase.ts` (e.g., `useStoreWatcher.ts`)
- Test files: co-located, `<name>.test.ts` next to `<name>.ts`
- Exports: barrel `index.ts` per package
- Types: prefixed with `Beacon` (e.g., `BeaconState`, `BeaconDerived`, `BeaconActions`)
- Unused params: prefixed with `_` (e.g., `_TDerived`)

### TypeScript

- `strict: true` everywhere
- `@typescript-eslint/no-explicit-any` is set to `warn` (not error) — `any` is used pragmatically
- Generic type parameters follow `TState`, `TDerived`, `TActions` convention
- `ActionParameters<T>` helper type strips the `state` param from action signatures

### Test Conventions

- Tests use Jest with `ts-jest` preset, `node` test environment
- Heavy use of manual `jest.mock()` for MobX and React — tests verify interactions with MobX/React APIs, not integration behavior
- Tests use dynamic `import()` in `beforeEach` after `jest.resetModules()` to get fresh module instances
- Nested `describe` blocks organized by feature/scenario
- `beforeEach` handles all setup; assertions in individual `it` blocks

## Architecture Notes

### createStore Internals

1. Validates no key collisions between `initialState` and `derived`
2. Wraps `initialState` in `observable()`
3. For each `derived` entry, creates a `computed()` and defines a getter on the store via `Object.defineProperty`
4. For each `actions` entry, wraps in `action()` with disposed-store guard
5. Attaches `actions`, `getStateSnapshot`, `registerCleanup`, `dispose`, `isDisposed` via `Object.defineProperty`
6. Calls `onStoreCreated(store)` if provided

### compose

`compose(...middlewares)` returns a function that `reduce`s middlewares left-to-right over a config. Each middleware receives the config from the previous one.

### Middleware Interception

Middleware intercepts store creation by transforming the `StoreConfig` before it reaches `createStore`. The `onStoreCreated` hook is the mechanism for post-creation side effects (e.g., setting up MobX `reaction`s for persistence). Middleware should preserve any existing `onStoreCreated` by calling it before adding its own behavior.

### Disposal

Stores support a cleanup lifecycle: middleware registers cleanup functions via `store.registerCleanup()`. Calling `store.dispose()` runs all cleanup functions, nullifies computed properties, replaces actions with no-ops, and sets `isDisposed = true`.

## Package Status

| Package                 | Status           | Notes                                                                                     |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `beacon`                | **Stable**       | Core library, v1.0.0                                                                      |
| `beacon-browserstorage` | **Stable**       | localStorage/sessionStorage middleware, v1.0.0                                            |
| `beacon-react-utils`    | **Stable**       | `useStoreWatcher` hook, v1.0.0                                                            |
| `beacon-reactquery`     | **Deprecated**   | Fundamentally flawed approach — do not use, do not modify, do not reference               |
| `beacon-actorstore`     | **Experimental** | xstate actor model — in active development and use. Do not modify unless explicitly asked |

## Release Process

Uses [Changesets](https://github.com/changesets/changesets). Config at `.changeset/config.json`:

- `baseBranch`: `main`
- `access`: `public`
- `commit`: `false` (changesets don't auto-commit)
- `updateInternalDependencies`: `patch`

Workflow: `pnpm changeset` -> select packages/bump type -> `pnpm version-packages` -> `pnpm release`.

## Things to Watch Out For

- **MobX observable wrapping**: `createStore` passes `initialState` to `observable()`. Nested objects/arrays become observable too. If you add state properties that shouldn't be deeply observed, you'll need `observable.ref` or similar — but that's not currently wired up.
- **`onStoreCreated` chaining**: When writing middleware, always capture and call the existing `onStoreCreated` before adding yours. Failing to do this silently drops other middleware's post-creation hooks.
- **Test mocking style**: Tests mock MobX and React at the module level and verify calls. If you change how `createStore` interacts with MobX internals, most tests in `store.test.ts` will break. Note: `store.test.ts` and `compose.test.ts` are currently wrapped in `describe.skip`.
- **Dual format output**: tsdown builds both CJS (`dist/index.cjs`) and ESM (`dist/index.mjs`). The `exports` field in each `package.json` maps these. Don't change the entry point structure without updating both.
- **Turbo pipeline ordering**: `test` depends on `build`. If you only run `pnpm test` at root, Turbo builds first. Running `jest` directly inside a package skips the build step.
- **`workspace:*` vs `workspace:^`**: Internal deps use `workspace:*` (resolved to exact version on publish). The root `package.json` uses `workspace:^` for some — be consistent with whichever the target package already uses.
- **React 19**: The repo uses React 19.2.3. `useEffectEvent` is used in `beacon-react-utils` — this is a React 19 API.
- **Dispose guards**: Actions and `getStateSnapshot` check `isDisposed` before executing. If you add new store methods, include the same guard.
