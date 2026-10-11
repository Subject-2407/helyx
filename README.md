# Helyx

Helyx is a browser-based pixel-art action MMO: a Phaser and React client talking to an
authoritative Node game server, built as a pnpm monorepo.

This file is for people who want to work on the code: how to set it up, run it, test it and
where things live.

## Prerequisites

- **Node.js 24** (the exact major is in `.nvmrc`; `engines` rejects other majors).
- **pnpm 10**, provided through Corepack (the version is pinned in `package.json`).
- **Docker Desktop** (or Docker Engine) with **Compose v2** (`docker compose`, not
  `docker-compose`).
- Git. On Windows, use a shell that can run the Git hooks (Git Bash works).

## Setup

```sh
corepack enable
pnpm i
cp .env.example .env
docker compose -f infra/docker-compose.dev.yml up -d
pnpm dev
```

- `pnpm i` also installs the Git hooks (through the `prepare` script).
- `.env.example` holds safe local placeholders for every setting, with a comment on each. Your
  `.env` is ignored by Git; never commit real secrets.
- The dev compose file starts PostgreSQL (`localhost:5432`), Redis (`localhost:6379`) and
  Toxiproxy (control API on `localhost:8474`, proxied ports 15432, 16379 and 12567 for latency
  and failure experiments). It works without a `.env` file. Leave it running while you work.
- `pnpm dev` starts the client and the server with hot reload:
  - client (Vite): <http://localhost:5173>
  - game server: <http://localhost:2567> (`/healthz` and `/readyz`; the client dev server
    proxies `/api`, `/matchmake`, `/healthz` and `/readyz` to it)

Stop the dev services with `docker compose -f infra/docker-compose.dev.yml down` (add `-v` to
also delete their data volumes).

## Running the full stack locally

The production-like stack (Caddy serving the built client over HTTPS, game server, worker,
PostgreSQL, Redis) runs from `infra/docker-compose.yml`:

```sh
cp .env.example .env   # if you have not already
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

- In `.env`, set `PUBLIC_URL=https://localhost`. `DOMAIN=localhost` makes Caddy issue a
  certificate from its own local authority.
- Open <https://localhost>. Your browser does not trust Caddy's local certificate yet: accept
  the warning once (or add Caddy's root certificate to your trust store).
- Only Caddy publishes ports (80 and 443); everything else stays on the internal network.
- Stop it with `docker compose -f infra/docker-compose.yml down`.

## Root commands

| Command                    | What it does                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                 | Runs every package's `dev` task (client and server with hot reload).                                             |
| `pnpm build`               | Builds every package (Turborepo, dependencies first).                                                            |
| `pnpm typecheck`           | Type-checks every package (`tsc --noEmit`, strict).                                                              |
| `pnpm test`                | Runs all unit tests once with Vitest and coverage gates.                                                         |
| `pnpm test:e2e`            | Runs the Playwright browser tests of the client.                                                                 |
| `pnpm lint`                | ESLint (no warnings allowed), Prettier check, module boundary check and the repository guard over tracked files. |
| `pnpm format`              | Formats the repository with Prettier.                                                                            |
| `pnpm depcruise`           | Checks module boundaries and circular imports with dependency-cruiser.                                           |
| `pnpm run guard <command>` | Runs the repository guard: `staged`, `tracked`, `commit-msg <file>` or `commits <from>..<to>`.                   |
| `pnpm content:validate`    | Validates the game content data.                                                                                 |
| `pnpm assets:validate`     | Validates the source assets.                                                                                     |

Before you push, run the same checks CI runs:

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm content:validate && pnpm assets:validate
```

Playwright browsers are not installed by `pnpm i`. Install them once before `pnpm test:e2e`:

```sh
pnpm --filter @helyx/client exec playwright install chromium firefox
```

To run one package's script, use a filter, for example `pnpm --filter @helyx/server dev`.

## Folder map

```text
apps/
  client/          @helyx/client: Phaser game + React overlay, built with Vite
  server/          @helyx/server: HTTP API, game rooms, simulation, persistence, background jobs
packages/
  shared/          @helyx/shared: pure TypeScript rules, constants, deterministic simulation, seeded RNG
  protocol/        @helyx/protocol: network message codes, message types and validators
  content/         @helyx/content: game data as JSON, its schemas, validator and loader, string tables
  db/              @helyx/db: database schema, migrations, client factory, dev seed
  config/          @helyx/config: shared TypeScript and ESLint presets (no runtime code)
tools/
  asset-pipeline/  @helyx/asset-pipeline: placeholder generation, palette checks, atlas packing
  content-cli/     @helyx/content-cli: validate, build and scaffold content
  bots/            @helyx/bots: headless clients for load and network tests
  repo-guard/      @helyx/repo-guard: checks run by the Git hooks and CI
infra/             Docker Compose files, Dockerfiles, Caddyfile, Toxiproxy config
.github/           CI workflows
assets/            source art and audio (input of the asset pipeline; added as content grows)
```

Generated output (`dist/`, `coverage/`, the client's `public/assets/` and `public/content/`,
the content bundle) is ignored by Git. Rebuild it instead of committing it.

## Module boundaries

These rules are enforced by dependency-cruiser and ESLint (`pnpm lint`), so a violation fails
CI.

- **The server decides every outcome.** The client renders, reads input, predicts its own
  movement and shows what the server reports. Damage, loot, randomness, costs and the success of
  any action are computed on the server only.
- **`packages/shared` is pure.** No I/O, no DOM, no Node APIs, no timers, no `Math.random` and
  no `Date`. Time and randomness are passed in (a clock and a seeded RNG), which keeps the rules
  deterministic and testable. It depends on no other workspace package.
- **Each game formula exists once**, in `packages/shared`, using named constants. Gameplay code
  calls it; it never re-implements it or hard-codes numbers.
- **Allowed workspace imports:**
  - `protocol`, `content` and `db` may import `shared` only.
  - `client` may import `shared`, `protocol` and `content` (schemas, types and the loader, never
    the raw data files). It never imports `server` or `db`, or Node built-ins.
  - `server` may import `shared`, `protocol`, `content` and `db`. It never imports `client`,
    React or Phaser.
  - `tools/*` may import the packages (the bots do not import `db`); apps never import tools.
- **No circular imports**, in any package.
- **Inside the server:** systems may use the world, services, `shared` and `content`; services
  never import systems or rooms; database repositories are used only by services, jobs, HTTP
  routes and auth.
- **Inside the client:** React UI code never imports Phaser and scenes never import React. They
  talk only through the state stores and the UI bridge.
- **Content is data.** A new monster, ability, item, quest or NPC is JSON validated by a schema
  (plus a map, where needed). Code changes are for new mechanics.
- **Dependencies are injected.** Only the entry points (`main.ts` of each app, tool entry
  points) create infrastructure such as the database pool, Redis or the game engine. Extend
  behavior by registering a handler or adding data, not by editing a central `switch`.

## Working on `packages/shared`

`@helyx/shared` holds the game rules that both the client and the server run. Everything is
reachable from the package entry point, which re-exports one barrel per folder.

```text
packages/shared/src/
  balance/         balance formulas, one module per rule area, and the constants they use
    constants.ts   K: every tuning number, as one flat frozen object (grouped in constants/)
    tables/        rule tables (rows rather than single numbers), re-exported by constants.ts
    __golden__/    expected values for the golden tests, as JSON
  sim/             the deterministic fixed-step movement simulation shared by client and server
  geometry/        hitbox shapes, overlap tests and line of sight on the collision grid
  time/            the clock port, a fake clock for tests, and the in-game day and season clock
  rng/             the random number port and the seeded sfc32 generator
  types/           ids and enums shared with the protocol and the content schemas
  i18n/            builders for string-table keys
  net-constants.ts tick rates, input limits and other network numbers
  testing/         contract suites and the constant test seeds (test code only)
```

**Changing a balance number.** Change the constant in `balance/constants/` (or the row in
`balance/tables/`) and the matching expected value in the module's `__golden__/*.json` in the
same commit. Gameplay code never repeats a number: it imports `K` or calls the formula. Content
data that needs a tuning number refers to it by its key in `K`.

**Golden tests.** Every formula module has a test file next to it that checks the worked values
from its golden JSON. Integers must match exactly; fractional values are compared to four
decimal places unless the test says otherwise. Tests take their randomness from `createSfc32`
with the seeds exported by `@helyx/shared/testing`, so every failure replays the same way.

**Purity rules.** Shared code has no dependencies, performs no I/O and never reads the time or
an unseeded random source: the caller passes in a `Clock` or a timestamp and an `Rng`. The
movement simulation goes further and must give byte-identical results on every engine: it uses
only basic arithmetic, `Math.round`, `floor`, `min`, `max`, `abs` and `sign`, never `Math.sqrt`,
`Math.pow` or trigonometry, and never depends on object key order. A determinism test replays
thousands of seeded input sequences and compares the output with a stored hash.

**Formulas are pure functions.** Add a rule as a function that takes plain data and returns
plain data. Where a rule set will grow, register handlers in a map instead of extending a
`switch`. Keep modules under 400 lines and functions under 60.

## Conventions

- **TypeScript is strict** everywhere. Avoid `any`; when you truly need it, add an
  `eslint-disable-next-line` comment with the reason.
- **Naming:** files are `kebab-case.ts`, React components `PascalCase.tsx`, types and classes
  `PascalCase`, functions and variables `camelCase`, constants `UPPER_SNAKE` inside const
  objects. Content IDs are `snake_case` with a type prefix and never change once added; rename
  the display text instead.
- **Player-facing text goes through i18n keys.** Never hard-code English in UI or gameplay code.
  The server sends keys and parameters, not display strings; string tables live in
  `packages/content/i18n/`.
- **Tests live next to the source** as `*.test.ts`. Server integration tests go in
  `apps/server/test/`, browser tests in `apps/client/e2e/`.
- **Every client message is validated** with a schema before the server acts on it.
- **Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)**:
  `type(scope): description` in the imperative mood, header at most 72 characters, one logical
  change per commit. Allowed types: `feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`,
  `build`, `ci`, `chore`, `revert`. Mark breaking changes with `!` or a `BREAKING CHANGE:`
  footer.
- **No co-author or tool-credit trailers.** Commit messages carry no co-author lines and no
  "generated with" or AI-credit footers. The hooks reject them.
- **Never skip the hooks** (no `--no-verify`). The `pre-commit` and `commit-msg` hooks run
  commitlint and the repository guard, and CI repeats every check.
- **Only `README.md` files may be committed as documents.** Other Markdown, Word or PDF files
  are ignored by Git and rejected by the guard. Do not force-add them. Stage files by path and
  check `git status` before committing.
- **Code comments explain the why in plain words.** Do not point at documents outside the
  repository from code, comments, tests or commit messages.
