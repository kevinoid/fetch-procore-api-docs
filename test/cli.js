/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

import assert from 'assert';
// TODO [engine:node@>=14]: Use readFile from 'fs/promises'
import { promises as fsPromises } from 'fs';
import { PassThrough } from 'stream';

import main from '../cli.js';
import { fetchProcoreApiDocsMockSymbol } from '../lib/symbols.js';

const { readFile } = fsPromises;

const packageJsonPromise =
  readFile(new URL('../package.json', import.meta.url), { encoding: 'utf8' })
    .then(JSON.parse);

const sharedArgs = ['node', 'fetchProcoreApiDocs'];

function neverCalled() {
  assert.fail('Should not be called');
}

function getTestOptions() {
  return {
    [fetchProcoreApiDocsMockSymbol]: neverCalled,
    stdin: new PassThrough(),
    stdout: new PassThrough({ encoding: 'utf8' }),
    stderr: new PassThrough({ encoding: 'utf8' }),
  };
}

describe('fetchProcoreApiDocs/cli.js', () => {
  it('rejects TypeError with no args', () => {
    return assert.rejects(
      () => main(),
      TypeError,
    );
  });

  it('rejects TypeError for non-Array Array-like first arg', () => {
    return assert.rejects(
      () => main({ 0: '', 1: '', length: 2 }, getTestOptions()),
      TypeError,
    );
  });

  it('rejects TypeError for non-Array iterable first arg', () => {
    // eslint-disable-next-line no-empty-function
    const iter = (function* () {}());
    return assert.rejects(
      () => main(iter, getTestOptions()),
      TypeError,
    );
  });

  it('rejects TypeError for Array with less than 2 items', () => {
    return assert.rejects(
      () => main(['node'], getTestOptions()),
      TypeError,
    );
  });

  it('rejects TypeError for non-Object second arg', () => {
    return assert.rejects(
      () => main(sharedArgs, 1),
      TypeError,
    );
  });

  it('rejects TypeError for missing stdin', () => {
    const options = getTestOptions();
    delete options.stdin;
    return assert.rejects(
      () => main(sharedArgs, options),
      TypeError,
    );
  });

  it('rejects TypeError for missing stdout', () => {
    const options = getTestOptions();
    delete options.stdout;
    return assert.rejects(
      () => main(sharedArgs, options),
      TypeError,
    );
  });

  it('rejects TypeError for missing stderr', () => {
    const options = getTestOptions();
    delete options.stderr;
    return assert.rejects(
      () => main(sharedArgs, options),
      TypeError,
    );
  });

  it('writes error and exit 1 for unexpected option', async () => {
    const options = getTestOptions();
    const code = await main([...sharedArgs, '--unexpected'], options);
    assert.strictEqual(code, 1);
    assert.strictEqual(options.stdout.read(), null);
    assert.strictEqual(
      options.stderr.read(),
      "error: unknown option '--unexpected'\n",
    );
  });

  it('writes error and exit 1 for unexpected args', async () => {
    const options = getTestOptions();
    const code = await main([...sharedArgs, 'unexpected'], options);
    assert.strictEqual(code, 1);
    assert.strictEqual(options.stdout.read(), null);
    assert.strictEqual(
      options.stderr.read(),
      'error: too many arguments. Expected 0 arguments but got 1.\n',
    );
  });

  for (const helpOption of ['-h', '--help']) {
    it(`writes usage to stdout with exit 0 for ${helpOption}`, async () => {
      const options = getTestOptions();
      const code = await main([...sharedArgs, helpOption], options);
      assert.strictEqual(code, 0);
      assert.strictEqual(
        options.stdout.read(),
        `Usage: fetchProcoreApiDocs [options]

Command description.

Options:
  -q, --quiet    Print less output
  -v, --verbose  Print more output
  -V, --version  output the version number
  -h, --help     display help for command
`,
      );
      assert.strictEqual(options.stderr.read(), null);
    });
  }

  for (const verOption of ['-V', '--version']) {
    it(`writes version to stdout then exit 0 for ${verOption}`, async () => {
      const packageJson = await packageJsonPromise;
      const options = getTestOptions();
      const code = await main([...sharedArgs, verOption], options);
      assert.strictEqual(code, 0);
      assert.strictEqual(
        options.stdout.read(),
        `${packageJson.version}\n`,
      );
      assert.strictEqual(options.stderr.read(), null);
    });
  }

  it('writes error to stderr and exit 1 on rejection', async () => {
    const options = getTestOptions();
    const err = new Error('test');
    options[fetchProcoreApiDocsMockSymbol] = () => Promise.reject(err);
    const code = await main(sharedArgs, options);
    assert.strictEqual(code, 1);
    assert.strictEqual(options.stdout.read(), null);
    assert.strictEqual(options.stderr.read(), `${err}\n`);
  });

  it('writes error to stderr and exit 1 on throw', async () => {
    const options = getTestOptions();
    const err = new Error('test');
    options[fetchProcoreApiDocsMockSymbol] = () => { throw err; };
    const code = await main(sharedArgs, options);
    assert.strictEqual(code, 1);
    assert.strictEqual(options.stdout.read(), null);
    assert.strictEqual(options.stderr.read(), `${err}\n`);
  });

  it('writes fetch error to stderr and exit 1', async () => {
    const options = getTestOptions();
    const err = new Error('test');
    options[fetchProcoreApiDocsMockSymbol] = () => Promise.allSettled([
      Promise.resolve(),
      Promise.reject(err),
    ]);
    const code = await main(sharedArgs, options);
    assert.strictEqual(code, 1);
    assert.strictEqual(options.stdout.read(), null);
    assert.strictEqual(options.stderr.read(), `${err}\n`);
  });

  it('write nothing and exit 0 if no error', async () => {
    const options = getTestOptions();
    options[fetchProcoreApiDocsMockSymbol] = () => Promise.allSettled([
      Promise.resolve(),
    ]);
    const code = await main(sharedArgs, options);
    assert.strictEqual(code, 0);
    assert.strictEqual(options.stdout.read(), null);
    assert.strictEqual(options.stderr.read(), null);
  });
});
