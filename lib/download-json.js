/**
 * @copyright Copyright 2016-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const fetchJson = require('./fetch-json.js');
const { hasWronly } = require('./check-fs-flags.js');

// TODO [engine:node@>=15]: Use require('stream/promises').pipeline
const pipelineP = promisify(pipeline);

module.exports =
async function downloadJson(url, filename, fetchOptions, fileOptions) {
  // If flags doesn't include O_WRONLY, .write() fails with a cryptic
  // 'error' after 'open' (which also complicates error handling).
  // Abort early with a comprehensible error.
  if (fileOptions && fileOptions.flags && !hasWronly(fileOptions.flags)) {
    throw new RangeError('flags must include O_WRONLY');
  }

  const response = await fetchJson(url, fetchOptions);
  // TODO: Use https://github.com/npm/write-file-atomic when overwriting?
  //       (and fsync containing directory after all write+renames complete)
  const writer = createWriteStream(filename, {
    flags: 'wx',
    ...fileOptions,
    emitClose: true,
  });
  return pipelineP(response.body, writer);
};
