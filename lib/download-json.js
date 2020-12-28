/**
 * @copyright Copyright 2016-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const fetchJson = require('./fetch-json.js');

// TODO [engine:node@>=15]: Use require('stream/promises').pipeline
const pipelineP = promisify(pipeline);

module.exports =
async function downloadJson(url, filename, fetchOptions, fileOptions) {
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
