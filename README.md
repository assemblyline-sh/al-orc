# @assemblyline/al-orc

The [Assembly Line](https://assemblyline.sh) Orchestrator's client + `al-orc` CLI — a **2-in-1**:
import the client in code, or use the CLI to push lines and stations, run them, and read work
records.

```bash
npm install -g @assemblyline/al-orc
al-orc config profiles add acme --api-key <key> --api-secret <secret>
al-orc status                                  # org and key the profile belongs to
al-orc lines push --all && al-orc stations push --all   # from a factory repo root
al-orc stations run EX0
al-orc work-records list --station EX0
```

Profiles live in `~/.assemblyline/al-orc/config.yml` (mode 0600; override the folder with
`AL_ORC_CONFIG_DIR`). The CLI never reads `.env`.

## Library

```js
import { alOrc } from '@assemblyline/al-orc';

const orc = alOrc({ api_key, api_secret });   // api_url optional (defaults to the hosted origin)
const { data: stations } = await orc.stations.list({ tag: 'daily' });
const station = await orc.stations.get(id);                       // unwrapped record
const { work_record_id } = await orc.stations.run(id, { overrides: { dry_run: true } });
await orc.workRecords.cancel(wrId);
```

Credentials are **explicit** — the client never reads `process.env`. Code serving several orgs constructs one client per org: `alOrc(orgACreds)`.

## Namespaces

| Namespace | Methods |
|---|---|
| `orc.lines` | `list · getAll · get · create · update · delete` — a line owns the location its stations run at |
| `orc.stations` | `list · getAll · get · create · update · delete · archive · unarchive · run · getTags · setTags` |
| `orc.workRecords` | `list · getAll · get · activity · cancel · getTags · setTags` |
| `orc.tags` | `list · create · update · delete · resolveNames · ensure` |
| `orc.supportingDocs` | `get · downloadStream` |
| `orc.factorySessions` | `list · getAll · get` — one row per factory session start |
| `orc.me()` | the org and API key the credentials belong to |
| `orc.checkConnection()` | credentials check via `me`; never throws and never claims work |

Return shapes: single-record ops return the unwrapped record; `list` returns `{ data, page_context }`;
`getAll` returns a flat array.

## Endpoint contract

Station routes live under `/api/v1/stations/*`; work records filter by `?station=`. Every endpoint is defined exactly once, in `src/resources/` — the CLI and the library both
call it, so they can't drift.

## Output conventions

Every command's terminal output follows these. They were implicit for a long time and drifted —
`format.js` is copy-pasted across six sibling CLIs and each copy diverged — so they are written down
here and covered by `tests/cli/format.test.js`. Use the `src/cli/utils/format.js` helpers rather than
formatting inline; that is what keeps `al-orc` and `al-control` agreeing.

**Timestamps** — always `formatDate()`, never `toISOString()` or a raw `Date`. Output is the
operator's **local** timezone, because everything these get compared against (`pm2 logs`, file mtimes,
`al-control` output) is local. The orchestrator returns UTC, so printing it verbatim silently misread
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

## License

Apache-2.0
