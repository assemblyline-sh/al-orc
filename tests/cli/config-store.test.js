import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, lstatSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Set before the import: the store resolves its folder on load.
process.env.AL_ORC_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'al-orc-cfg-'));
const { familyRoot } = await import('../../src/cli/config-store.js');

const tempHome = () => mkdtempSync(join(tmpdir(), 'al-orc-home-'));

describe('familyRoot', () => {
  test('moves ~/.assemblyline to ~/.al and leaves nothing behind', () => {
    const home = tempHome();
    mkdirSync(join(home, '.assemblyline', 'al-orc'), { recursive: true });
    writeFileSync(join(home, '.assemblyline', 'al-orc', 'config.yml'), 'orgs: {}\n');

    expect(familyRoot(home)).toBe(join(home, '.al'));

    expect(readFileSync(join(home, '.al', 'al-orc', 'config.yml'), 'utf8')).toBe('orgs: {}\n');
    expect(existsSync(join(home, '.assemblyline'))).toBe(false);
  });

  test('leaves both alone when ~/.al already exists', () => {
    const home = tempHome();
    mkdirSync(join(home, '.al'));
    mkdirSync(join(home, '.assemblyline'));

    familyRoot(home);

    expect(lstatSync(join(home, '.assemblyline')).isDirectory()).toBe(true);
  });

  test('a fresh machine moves nothing', () => {
    const home = tempHome();

    expect(familyRoot(home)).toBe(join(home, '.al'));

    expect(existsSync(join(home, '.assemblyline'))).toBe(false);
  });
});
