/**
 * @copyright Copyright 2016-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const {
  constants: { O_APPEND, O_EXCL, O_WRONLY },
} = require('fs');

exports.hasAppend =
function hasAppend(flags) {
  switch (typeof flags) {
    case 'number':
      // eslint-disable-next-line no-bitwise
      return Boolean(flags & O_APPEND);
    case 'string':
      return flags.includes('a');
    default:
      return false;
  }
};

exports.hasExcl =
function hasExcl(flags) {
  switch (typeof flags) {
    case 'number':
      // eslint-disable-next-line no-bitwise
      return Boolean(flags & O_EXCL);
    case 'string':
      return flags.includes('x');
    default:
      return false;
  }
};

exports.hasWronly =
function hasWronly(flags) {
  switch (typeof flags) {
    case 'number':
      // eslint-disable-next-line no-bitwise
      return Boolean(flags & O_WRONLY);

    case 'string':
      return flags.includes('w') || flags.includes('a');

    default:
      return false;
  }
};
