/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const assert = require('assert');

const fetchProcoreApiDocs = require('..');

describe('fetchProcoreApiDocs', () => {
  it('rejects with TypeError if options is null', () => {
    assert.rejects(
      () => fetchProcoreApiDocs(null),
      TypeError,
    );
  });

  it('rejects with TypeError if options is not an object', () => {
    assert.rejects(
      () => fetchProcoreApiDocs(''),
      TypeError,
    );
  });
});
