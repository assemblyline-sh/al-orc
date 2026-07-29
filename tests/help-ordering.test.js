import { describe, it, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'cli.js');

/** Run `<command> --help` and return the heading lines in the order shown. */
function helpHeadings(args) {
  const out = execFileSync('node', [bin, ...args.split(' '), '--help'], {
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .filter((l) => /^(Positionals:|Options:|Global Options:)$/.test(l));
}

describe('help layout', () => {
  it("shows a command's own options above the inherited global ones", () => {
    // stations show: Positionals (id) → Options → Global Options (profile/help/version)
    expect(helpHeadings('stations show x')).toEqual([
      'Positionals:',
      'Options:',
      'Global Options:',
    ]);
  });

  it('keeps positionals first when options are bundled before the positional', () => {
    // tags create defines its field options via localOptions; positional must still lead.
    expect(helpHeadings('tags create x')).toEqual([
      'Positionals:',
      'Options:',
      'Global Options:',
    ]);
  });

  it('omits an empty Options group for commands with no local options', () => {
    // config profiles use has a positional but no local options.
    expect(helpHeadings('config profiles use x')).toEqual([
      'Positionals:',
      'Global Options:',
    ]);
  });

  it('groups global options under their own heading even without positionals', () => {
    // status has a local --json option but no positional.
    expect(helpHeadings('status')).toEqual(['Options:', 'Global Options:']);
  });
});
