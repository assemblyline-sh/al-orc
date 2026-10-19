import { describe, it, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStepOverrides } from '../../src/cli/stations/run.js';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'cli.js');

describe('stations run overrides', () => {
  it('turns extra flags into snake_case overrides and ignores its own flags', () => {
    const argv = { _: ['stations', 'run'], $0: 'al-orc', id: 'EX1', json: true, source_bin: 'a/b', 'max-files': 3, maxFiles: 3 };
    const { overrides, fromCli } = buildStepOverrides(argv, null);
    expect(overrides).toEqual({ source_bin: 'a/b', max_files: 3 });
    expect(fromCli).toEqual(['source_bin', 'max_files']);
  });

  it('gets past argument parsing with unknown flags (strict mode is off for run only)', () => {
    const env = { ...process.env, AL_ORC_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'al-orc-')) };
    const run = (args) => {
      try {
        execFileSync('node', [bin, ...args], { env, encoding: 'utf8', stdio: 'pipe' });
        return '';
      } catch (err) {
        return String(err.stderr);
      }
    };
    // With no profile, run stops at credentials, after parsing.
    expect(run(['stations', 'run', 'EX1', '--source_bin=a/b'])).toMatch(/No orchestrator profile selected/);
    expect(run(['stations', 'show', 'EX1', '--bogus'])).toMatch(/Unknown argument: bogus/);
  });
});
