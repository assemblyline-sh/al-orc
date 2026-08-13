// Work records carry the station as a bare id (`process`), which is unreadable
// in a table. These cover the id → short_code labelling, including the
// degradation path: losing the label must never sink the command.
import { jest } from '@jest/globals';

const { buildStationLabelMap, stationLabel } = await import('../../src/cli/utils/station-labels.js');

/** A fake fobOrc client whose stations.getAll behaves as `impl` says. */
function fakeOrc(impl) {
  return { stations: { getAll: impl } };
}

describe('buildStationLabelMap', () => {
  it('maps station ids to their short_codes', async () => {
    const orc = fakeOrc(async () => [
      { id: '2XqwQGJuATJE', short_code: 'EM1' },
      { id: 'VUdGYCVpNb1F', short_code: 'EM3' },
    ]);

    const labels = await buildStationLabelMap(orc);

    expect(labels.get('2XqwQGJuATJE')).toBe('EM1');
    expect(labels.get('VUdGYCVpNb1F')).toBe('EM3');
  });

  it('fetches every station in one call, not one per record', async () => {
    const getAll = jest.fn(async () => [{ id: 'a', short_code: 'EM1' }]);

    await buildStationLabelMap(fakeOrc(getAll));

    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('includes archived stations — a work record outlives its station', async () => {
    const getAll = jest.fn(async () => []);

    await buildStationLabelMap(fakeOrc(getAll));

    expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ include_archived: true }));
  });

  it('skips stations with no short_code rather than mapping to undefined', async () => {
    const labels = await buildStationLabelMap(fakeOrc(async () => [{ id: 'a' }, { id: 'b', short_code: 'EM3' }]));

    expect(labels.has('a')).toBe(false);
    expect(labels.get('b')).toBe('EM3');
  });

  it('returns an empty map when the stations call fails', async () => {
    const labels = await buildStationLabelMap(
      fakeOrc(async () => {
        throw new Error('403 forbidden');
      }),
    );

    expect(labels.size).toBe(0);
  });

  it('tolerates a null response', async () => {
    await expect(buildStationLabelMap(fakeOrc(async () => null))).resolves.toEqual(new Map());
  });
});

describe('stationLabel', () => {
  const labels = new Map([['2XqwQGJuATJE', 'EM1']]);

  it('renders the short_code when the id resolves', () => {
    expect(stationLabel('2XqwQGJuATJE', labels)).toBe('EM1');
  });

  it('falls back to the raw id — still what `stations show <id>` takes', () => {
    expect(stationLabel('unknownId', labels)).toBe('unknownId');
  });

  it('uses the em-dash placeholder for an absent station', () => {
    expect(stationLabel(undefined, labels)).toBe('—');
    expect(stationLabel(null, labels)).toBe('—');
    expect(stationLabel('', labels)).toBe('—');
  });
});
