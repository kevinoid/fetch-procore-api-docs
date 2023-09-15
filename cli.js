/**
 * @copyright Copyright 2017-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module fetch-procore-api-docs/cli.js
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Command } from 'commander';

import fetchProcoreApiDocs, { defaultResourceGroupsUrl, makeLinkToPath }
  from './index.js';
import { fetchProcoreApiDocsMockSymbol } from './lib/symbols.js';

/** Option parser to count the number of occurrences of the option.
 *
 * @private
 * @param {boolean|string} optarg Argument passed to option (ignored).
 * @param {number=} previous Previous value of option (counter).
 * @returns {number} previous + 1.
 */
function countOption(optarg, previous) {
  return (previous || 0) + 1;
}

async function readJson(pathOrUrl, options) {
  const content = await readFile(pathOrUrl, { encoding: 'utf8', ...options });
  return JSON.parse(content);
}

function makeLinkToOutputPath(resourceGroupsUrl, outputPath) {
  const linkToPath = makeLinkToPath(resourceGroupsUrl);
  return function linkToOutputPath(link) {
    return path.join(outputPath, linkToPath(link));
  };
}

/** Options for command entry points.
 *
 * @typedef {{
 *   env: !Object<string,string>,
 *   stdin: !module:stream.Readable,
 *   stdout: !module:stream.Writable,
 *   stderr: !module:stream.Writable
 * }} CommandOptions
 * @property {!Object<string,string>} env Environment variables.
 * @property {!module:stream.Readable} stdin Stream from which input is read.
 * @property {!module:stream.Writable} stdout Stream to which output is
 * written.
 * @property {!module:stream.Writable} stderr Stream to which errors and
 * non-output status messages are written.
 */
// const CommandOptions;

/** Entry point for this command.
 *
 * @param {!Array<string>} args Command-line arguments.
 * @param {!CommandOptions} options Options.
 * @returns {!Promise<number>} Promise for exit code.  Only rejected for
 * arguments with invalid type (or args.length < 2).
 */
export default async function fetchProcoreApiDocsMain(args, options) {
  if (!Array.isArray(args) || args.length < 2) {
    throw new TypeError('args must be an Array with at least 2 items');
  }

  if (!options || typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }

  if (!options.stdin || typeof options.stdin.on !== 'function') {
    throw new TypeError('options.stdin must be a stream.Readable');
  }
  if (!options.stdout || typeof options.stdout.write !== 'function') {
    throw new TypeError('options.stdout must be a stream.Writable');
  }
  if (!options.stderr || typeof options.stderr.write !== 'function') {
    throw new TypeError('options.stderr must be a stream.Writable');
  }

  let errVersion;
  const command = new Command()
    .exitOverride()
    .configureOutput({
      writeOut: (str) => options.stdout.write(str),
      writeErr: (str) => options.stderr.write(str),
      getOutHelpWidth: () => options.stdout.columns,
      getErrHelpWidth: () => options.stderr.columns,
    })
    .allowExcessArguments(false)
    .description('Download Procore API documentation OpenAPI content.')
    .option('-o, --output <dir>', 'output directory', '.')
    .option('-q, --quiet', 'print less output', countOption)
    .option('-v, --verbose', 'print more output', countOption)
    // TODO [engine:node@>=17.5]: .version(packageJson.version) from JSON import
    // See https://github.com/nodejs/node/pull/41736
    // and https://nodejs.org/api/esm.html#json-modules
    .option('-V, --version', 'output the version number')
    // throw exception to stop option parsing early, as commander does
    // (e.g. to avoid failing due to missing required arguments)
    .on('option:version', () => {
      errVersion = new Error('version');
      throw errVersion;
    });

  try {
    command.parse(args);
  } catch (errParse) {
    if (errVersion) {
      const packageJson =
        await readJson(new URL('package.json', import.meta.url));
      options.stdout.write(`${packageJson.version}\n`);
      return 0;
    }

    // If a non-Commander error was thrown, treat it as unhandled.
    // It probably represents a bug and has not been written to stdout/stderr.
    // throw commander.{CommanderError,InvalidArgumentError} to avoid.
    if (typeof errParse.code !== 'string'
      || !errParse.code.startsWith('commander.')) {
      throw errParse;
    }

    return errParse.exitCode !== undefined ? errParse.exitCode : 1;
  }

  const argOpts = command.opts();

  if (argOpts.version) {
    const packageJson =
      await readJson(new URL('package.json', import.meta.url));
    options.stdout.write(`${packageJson.version}\n`);
    return 0;
  }

  const linkToPath = !argOpts.output ? undefined
    : makeLinkToOutputPath(defaultResourceGroupsUrl, argOpts.output);

  const verbosity = (argOpts.verbose || 0) - (argOpts.quiet || 0);
  const fetchProcoreApiDocsOrMock =
    options[fetchProcoreApiDocsMockSymbol] || fetchProcoreApiDocs;
  try {
    const results = await fetchProcoreApiDocsOrMock({ linkToPath });
    let exitCode = 0;
    for (const result of results) {
      if (result.status !== 'fulfilled') {
        exitCode = 1;
        options.stderr.write(`${result.reason}\n`);
      }
    }
    return exitCode;
  } catch (err) {
    options.stderr.write(`${verbosity > 0 ? err.stack : err}\n`);
    return 1;
  }
}
