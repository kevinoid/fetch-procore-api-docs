/**
 * @copyright Copyright 2016-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

// TODO [engine:node@>=17.5]: Use native fetch
import fetch from 'node-fetch';

import ResponseStatusError from './response-status-error.js';

export default async function fetchJson(url, options) {
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
}
