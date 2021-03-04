/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

const { strictEqual, throws } = require('assert');

const groupNameToUrlPath = require('../../lib/group-name-to-url-path.js');

describe('groupNameToUrlPath', () => {
  it('throws TypeError for undefined', () => {
    throws(groupNameToUrlPath, TypeError);
  });

  it('throws TypeError for null', () => {
    throws(() => groupNameToUrlPath(null), TypeError);
  });

  for (const [groupName, urlPath] of [
    ['Me', 'me'],
    ['Project Bid Types', 'project-bid-types'],
    ['Managed Equipment - Company Level', 'managed-equipment---company-level'],
    ['Global BIM Files', 'global-bim-files'],
    ['ToDos', 'todos'],
    ['RFIs', 'rfis'],
    [
      'Bulk Update Subcontractor Invoice (Requisition) Items',
      'bulk-update-subcontractor-invoice-requisition-items',
    ],
    ['Line Item Types (Cost Types)', 'line-item-types-cost-types'],
  ]) {
    it(`${JSON.stringify(groupName)} => ${JSON.stringify(urlPath)}`, () => {
      strictEqual(groupNameToUrlPath(groupName), urlPath);
    });
  }
});
