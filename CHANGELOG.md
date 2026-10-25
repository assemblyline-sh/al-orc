# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `al-orc login`: sign in through the browser instead of pasting a key and secret. Opens
  the Orchestrator's approve page (`--no-browser` only prints the URL, e.g. over SSH), where
  you pick one or more orgs; saves one profile per org, named after it (an existing name gets
  the org id appended). Orgs you already have a profile for show as connected. The current
  profile changes only when there was none.

## [0.2.0] - 2026-10-19

### Fixed
- `stations run <id> --key=value` passes extra flags as step overrides again; strict
  argument checking rejected them (broken since fob-orc 2026-07-26). Kebab-case flags become
  snake_case keys (`--max-files=3` → `max_files`), and yargs' camelCase copies are no longer
  sent. Every other command still rejects unknown flags.
- `work-records list --page <n>` works, as its "use --page" hint says.
- `lines list` and `stations list` honour `--page` and `--limit` instead of always returning the
  first 100, and print the same next-page hint.

### Removed
- **BREAKING (library):** the `location` credential and its `X-Location` header. Only the
  factory protocol (`/api/factory/*`) reads it, and al-orc never calls that.
- `formatCsv`, `formatCurrency` and `formatAmount` from `format.js`, unused since the fork.

### Changed
- Every source file is `// @ts-check`ed, and the API types now cover the fields the CLI reads
  (work-record timings and errors, supporting-document metadata, tag usage).
- `stations delete --cascade` and the code no longer say server support is pending; the
  orchestrator supports it.

## [0.1.1] - 2026-10-19

### Fixed
- `config profiles add` no longer requires `--api-url`; it defaults to
  `https://orchestrator.assemblyline.sh`, as the README's quick start assumes.

## [0.1.0] - 2026-10-19

First release as `@assemblyline/al-orc`, forked from `@finopsbricks/fob-orc` 0.2.0. Entries
below 0.1.0 are the history of `fob-orc`.

### Changed
- **BREAKING:** package `@assemblyline/al-orc`, binary `al-orc`, client factory `alOrc()`.
- **BREAKING:** default API URL `https://orchestrator.assemblyline.sh`.
- **BREAKING:** profiles live in `~/.assemblyline/al-orc/config.yml`; override with
  `AL_ORC_CONFIG_DIR`. `AL_DEBUG=1` prints stacks.
- **BREAKING:** station routes are `/api/v1/stations/*`; work records filter by `?station=`
  and carry the station id in `station`.
- **BREAKING:** `worker-sessions` is `factory-sessions` (`orc.factorySessions`,
  `/api/v1/factory-sessions`); fields `factory_name` and `factory_version`.
- `status` / `checkConnection()` read `GET /api/v1/me` and print the org and key. The old
  probe used the session poll, which could claim a pending step.

### Added
- `orc.me()`: the org and API key the credentials belong to.

### Removed
- **BREAKING:** `stations run --item` and the `item` option of `orc.stations.run()`.

## [0.2.0] - 2026-09-05

### Added
- `orc.lines` namespace (`list`, `getAll`, `get`, `create`, `update`, `delete`) against `/api/v1/lines`; `id` arguments accept a line code or id.
- `fob-orc lines list|show|pull|push`. Local files live at `.orchestrator/lines/<CODE>.json` with `id`, `code`, `name`, `description`, `location`. A line owns the worker location; stations name their line by code and inherit it (orchestrator D3).
- `stations list --line` now filters server-side (code or id).

### Changed
- **BREAKING:** `stations pull --all` pulls lines first, then stations. Station files no longer carry `location`.
- **BREAKING:** `stations push --all` pushes line files before station files, so a new station's `line` code exists server-side. `stations push` strips a stale per-station `location` with a notice, and refuses a station file with no `line`.

### Migration
- In every worker repo: `fob-orc lines pull --all && fob-orc stations pull --all`, commit.

## [0.1.1] - 2026-07-29

### Changed
- Help output: each command's own options now render under `Options:` above a dedicated `Global Options:` group (`--profile`/`--org`, `--help`, `--version`), instead of being interleaved. Help text only — no behavior change.
