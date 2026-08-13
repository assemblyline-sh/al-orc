/**
 * Station id → short_code labelling for commands that only get an id back.
 *
 * Work records carry the station as `process` — a bare id like `2XqwQGJuATJE`,
 * which nobody recognises. The short_code (`EM3`) is only on the station record,
 * so a lookup is needed. `stations.list()` returns every station with its
 * short_code in ONE request, so the whole map costs a single call regardless of
 * how many rows are being labelled — no per-row fetch.
 *
 * The map is deliberately not cached across calls: a CLI process is short-lived
 * and each command builds it at most once.
 */

/**
 * Build an id → short_code map from every station.
 *
 * Resolution is best-effort: if the stations call fails (permissions, transport,
 * an older orchestrator), an empty map comes back and callers fall through to
 * printing the raw id. Losing the nicer label must never sink a `work-records
 * list` that would otherwise have worked.
 *
 * @param {any} orc A credential-bound fobOrc client.
 * @returns {Promise<Map<string, string>>}
 */
export async function buildStationLabelMap(orc) {
  try {
    // include_archived: a work record outlives the station being archived, and
    // its rows should still resolve to a code rather than regressing to an id.
    const stations = await orc.stations.getAll({ include_archived: true });
    return new Map((stations || []).filter((s) => s?.id && s.short_code).map((s) => [s.id, s.short_code]));
  } catch {
    return new Map();
  }
}

/**
 * Label a station id for display: its short_code if known, else the raw id
 * (still useful — it's what `fob orc stations show <id>` takes), else the
 * em-dash placeholder the other formatters use for absent values.
 *
 * @param {string|undefined|null} id
 * @param {Map<string, string>} labels
 * @returns {string}
 */
export function stationLabel(id, labels) {
  if (!id) return '—';
  return labels.get(id) || id;
}
