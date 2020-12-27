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
async function downloadJson(url, filename, options) {
  const response = await fetchJson(url, options);
  const writer = createWriteStream(filename, {
    flags: 'wx',
    emitClose: true,
  });
  return pipelineP(response.body, writer);
};
