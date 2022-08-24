/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

import assert from 'node:assert';

import fetchProcoreApiDocs from '../index.js';

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

  it('rejects with TypeError if options.baseDir is not a string', () => {
    assert.rejects(
      () => fetchProcoreApiDocs({ baseDir: true }),
      TypeError,
    );
  });
});
