/**
 * @copyright Copyright 2016-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

/** Error resulting from the HTTP status code of a response. */
class ResponseStatusError extends Error {
  constructor(response, options) {
    const method = (options && options.method) || 'GET';
    const { status, statusText, url } = response;

    super(`${method} ${url} response status ${status} ${statusText}`);

    this.method = method;
    this.url = url;
    this.status = status;
    this.statusText = statusText;
  }
}
ResponseStatusError.prototype.name = 'ResponseStatusError';

module.exports = ResponseStatusError;
