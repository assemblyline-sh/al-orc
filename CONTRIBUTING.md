# Contributing to fob-orc

Thanks for helping. Bug reports and pull requests are welcome.

## Before you open an issue

- Run with `FOB_DEBUG=1` and include the command and error output.
- **Remove secrets first.** Never paste an API key or API secret. Replace business data in
  stations, work records and documents with placeholders.

## Development

```bash
npm install
npm test          # jest (ESM)
npm run typecheck # tsc against jsconfig
```

- Source is plain JavaScript (ES modules) with JSDoc types.
- The client (`src/index.js`, `src/resources/`, `src/http.js`) takes credentials as arguments
  and never reads `process.env` or the config file. Credential resolution lives in the CLI layer.
- Each CLI command lives in `src/cli/<resource>/<action>.js`. Tests mock `fetch`; they never
  call an Orchestrator.

## Pull requests

- One change per pull request, with tests.
- Add a line under `## [Unreleased]` in `CHANGELOG.md`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:` …).

By contributing, you agree that your contributions are licensed under the Apache-2.0 license.
