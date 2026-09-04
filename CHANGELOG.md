# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
