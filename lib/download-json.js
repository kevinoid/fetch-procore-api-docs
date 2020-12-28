/**
 * @copyright Copyright 2016-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const {
  createWriteStream,
  // https://github.com/mysticatea/eslint-plugin-node/issues/174
  // eslint-disable-next-line node/no-unsupported-features/node-builtins
  promises: {
    rename,
    unlink,
  },
} = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const fetchJson = require('./fetch-json.js');
const { hasAppend, hasExcl, hasWronly } = require('./check-fs-flags.js');

// TODO [engine:node@>=15]: Use require('stream/promises').pipeline
const pipelineP = promisify(pipeline);

module.exports =
function downloadJson(url, filename, fetchOptions, fileOptions) {
  // If flags doesn't include O_WRONLY, .write() fails with a cryptic
  // 'error' after 'open' (which also complicates error handling).
  // Abort early with a comprehensible error.
  if (fileOptions && fileOptions.flags && !hasWronly(fileOptions.flags)) {
    throw new RangeError('flags must include O_WRONLY');
  }

  const partOptions = {
    flags: 'wx',
    ...fileOptions,
    emitClose: true,
  };
  const { flags } = partOptions;
  // If flags has O_EXCL or O_APPEND, write directly to destination.
  // Otherwise, write to .part file and rename after complete download.
  const partFilename =
    hasExcl(flags) || hasAppend(flags) ? filename : `${filename}.part`;
  const writer = createWriteStream(partFilename, partOptions);

  async function onOpen() {
    try {
      const response = await fetchJson(url, fetchOptions);
      await pipelineP(response.body, writer);
      if (partFilename !== filename) {
        await rename(partFilename, filename);
      }
    } catch (err) {
      await unlink(partFilename);
      throw err;
    }
  }

  return new Promise((resolve, reject) => {
    writer.once('error', reject);
    writer.once('open', () => {
      writer.removeListener('error', reject);
      resolve(onOpen());
    });
  });
};
