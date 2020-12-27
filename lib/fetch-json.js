/**
 * @copyright Copyright 2016-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const fetch = require('node-fetch');

const ResponseStatusError = require('./response-status-error.js');

module.exports =
async function fetchJson(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...options && options.headers,
    },
  });

  if (!response.ok) {
    throw new ResponseStatusError(response, options);
  }

  return response;
};
