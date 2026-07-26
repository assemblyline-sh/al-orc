# @fob/orc

Orchestrator app client + `fob-orc` CLI — a **2-in-1**: import the client in workers, or use the CLI.
Part of the `fob-<tool>` wrapper family (see `fob-stm`, `fob-email`).

```js
import { fobOrc } from '@fob/orc';

const orc = fobOrc({ api_key, api_secret });   // api_url optional (defaults to the hosted origin)
const { data: stations } = await orc.stations.list({ tag: 'daily' });
const station = await orc.stations.get(id);                       // unwrapped record
const { work_record_id } = await orc.stations.run(id, { overrides: { dry_run: true } });
await orc.workRecords.cancel(wrId);
```

Credentials are **explicit** — the client never reads `process.env` (see engineering-standards
`no-ambient-configuration`). Multi-tenant callers construct one client per org: `fobOrc(orgACreds)`.

## Namespaces

| Namespace | Methods |
|---|---|
| `orc.stations` | `list · getAll · get · create · update · delete · archive · unarchive · run · getTags · setTags` |
| `orc.workRecords` | `list · getAll · get · activity · cancel · getTags · setTags` |
| `orc.tags` | `list · create · update · delete · resolveNames · ensure` |
| `orc.supportingDocs` | `get · downloadStream` |
| `orc.checkConnection()` | worker-poll health probe (never throws) |

Return shapes: single-record ops return the unwrapped record; `list` returns `{ data, page_context }`;
`getAll` returns a flat array.

## Endpoint contract

The orchestrator API/DB still says "process": station CRUD lives under `/api/v1/processes/*`, while
archive/unarchive use the canonical `/api/v1/stations/*`. Only the JS namespace/method names say
"station". Every endpoint is defined exactly once, in `src/resources/` — the CLI and the library both
call it, so they can't drift.

## Scripts

```bash
npm test         # jest (mocked fetch)
npm run typecheck  # tsc -p jsconfig.json  → 0 errors
```
