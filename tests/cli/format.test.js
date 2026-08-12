// Output conventions for the CLI's shared formatters. These are the rules the
// commands are expected to follow, so they belong under test rather than in
// prose alone — see CLAUDE.md "Output conventions".
const { formatDate, formatDuration, localTzLabel, truncate, formatPaginationHint } =
  await import('../../src/cli/utils/format.js');

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** What the local zone renders a given instant as; avoids baking one zone into the expectation. */
function expectedLocal(iso) {
  return new Date(iso).toLocaleString('sv-SE', { timeZone: LOCAL_TZ }).replace(',', '');
}

describe('formatDate', () => {
  it('renders local time, not UTC', () => {
    const iso = '2026-08-12T13:00:27.000Z';
    expect(formatDate(iso)).toBe(expectedLocal(iso));
  });

  it('uses YYYY-MM-DD HH:MM:SS with no comma', () => {
    expect(formatDate('2026-08-12T13:00:27.000Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('returns the em-dash placeholder for empty or unparseable input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('localTzLabel', () => {
  it('never returns a bare GMT/UTC offset — those belong in no column header', () => {
    expect(localTzLabel()).not.toMatch(/^(GMT|UTC)[+-]/);
  });

  it('is stable across calls, so a table header cannot disagree with itself', () => {
    expect(localTzLabel()).toBe(localTzLabel());
  });

  it('is non-empty', () => {
    expect(localTzLabel().length).toBeGreaterThan(0);
  });
});

describe('truncate', () => {
  it('returns the em-dash placeholder for empty values', () => {
    expect(truncate(null, 20)).toBe('—');
    expect(truncate(undefined, 20)).toBe('—');
    expect(truncate('', 20)).toBe('—');
    expect(truncate('   ', 20)).toBe('—');
  });

  it('leaves a short value alone', () => {
    expect(truncate('Unknown slug', 40)).toBe('Unknown slug');
  });

  it('caps a long value at max, ellipsis included', () => {
    const out = truncate('x'.repeat(100), 40);
    expect(out).toHaveLength(40);
    expect(out.endsWith('…')).toBe(true);
  });

  it('collapses newlines so a multi-line error cannot break row alignment', () => {
    expect(truncate('line one\nline two', 40)).toBe('line one line two');
    expect(truncate('a\n\n  b\tc', 40)).toBe('a b c');
  });

  it('passes numbers through', () => {
    expect(truncate(0, 10)).toBe('0');
    expect(truncate(42, 10)).toBe('42');
  });
});

describe('formatDuration', () => {
  it('returns the placeholder when either end is missing', () => {
    expect(formatDuration(null, '2026-08-12T13:00:00Z')).toBe('—');
    expect(formatDuration('2026-08-12T13:00:00Z', null)).toBe('—');
  });

  it('formats a sub-minute span in seconds', () => {
    expect(formatDuration('2026-08-12T13:00:00Z', '2026-08-12T13:00:27Z')).toBe('27s');
  });
});

describe('formatPaginationHint', () => {
  it('is silent when everything fits on one page', () => {
    expect(formatPaginationHint({ has_more: false, count: 4, total: 4, page: 1 })).toBeNull();
    expect(formatPaginationHint(null)).toBeNull();
    expect(formatPaginationHint(undefined)).toBeNull();
  });

  it('names the next page when there is more — the reason Total: alone misleads', () => {
    const hint = formatPaginationHint({ has_more: true, count: 100, total: 250, page: 1 });
    expect(hint).toContain('100');
    expect(hint).toContain('250');
    expect(hint).toContain('--page 2');
  });
});
