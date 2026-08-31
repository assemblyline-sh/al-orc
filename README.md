# @finopsbricks/fob-orc

Orchestrator app client + `fob-orc` CLI — a **2-in-1**: import the client in workers, or use the CLI.
Part of the `fob-<tool>` wrapper family (see `fob-stm`, `fob-email`).

```js
import { fobOrc } from '@finopsbricks/fob-orc';

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

## Output conventions

Every command's terminal output follows these. They were implicit for a long time and drifted —
`format.js` is copy-pasted across six sibling CLIs and each copy diverged — so they are written down
here and covered by `tests/cli/format.test.js`. Use the `src/cli/utils/format.js` helpers rather than
formatting inline; that is what keeps `fob-orc` and `fob-worker` agreeing.

**Timestamps** — always `formatDate()`, never `toISOString()` or a raw `Date`. Output is the
operator's **local** timezone, because everything these get compared against (`pm2 logs`, file mtimes,
`fob worker` output) is local. The orchestrator returns UTC, so printing it verbatim silently misread
every timestamp by the local offset. Name the zone **once** per table or block via `localTzLabel()` in
the column header — `CREATED (${localTzLabel()})` — never per row. Durations use `formatDuration()`.

**Empty values** — the em-dash `'—'`, never `'-'`, `'N/A'` or blank. `formatDate`, `formatDuration`
and `truncate` already return it, so `|| '—'` is only needed for plain fields.

**Free text** — `truncate(value, max)` for anything unbounded (errors, titles, descriptions). It
collapses whitespace first: a newline inside an error would otherwise break the table's alignment.

**Tables** — `formatTable(headers, rows)`; pass no options object. Headers are UPPERCASE. Prefer the
columns an operator needs to act (what failed, how long, who triggered it) over the minimum that
identifies a row.

**Lists** — print the table, a blank line, then `Total: N <things>`. Follow it with
`formatPaginationHint(page_context)`, which is silent on a single page: `Total:` counts the rows
*returned*, so without the hint a truncated page reads as the whole set. Empty results print
`No <things> found` (no trailing period) and return early. `--json` prints the raw array, before the
empty check, and is never decorated.

**Detail views** — `formatHeader`/`formatSection` for structure, `formatField(label, value, 14)` for
fields; 14 is the shared label width. Order: identity, then timestamps, then nested sections. A nested
section's own empty case *does* take a period (`No tasks.`), unlike a top-level list.

**Advisory lines** — prefix `!  ` and indent continuations by three spaces, after a blank line. Say
what to do about it, not just what is wrong.

## Scripts

```bash
npm test         # jest (mocked fetch)
npm run typecheck  # tsc -p jsconfig.json  → 0 errors
```
