/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module fetch-procore-api-docs
 */

'use strict';

const { paramCase } = require('param-case');
// TODO [engine:node@>=12.9]: Use global Promise.allSettled
const allSettled = require('promise.allsettled');
const { debuglog } = require('util');

const downloadJson = require('./lib/download-json.js');
const fetchJson = require('./lib/fetch-json.js');

const debug = debuglog('fetch-procore-api-docs');

const restBaseUrl =
  'https://s3-us-west-2.amazonaws.com/procore-api-documentation-production/master/rest_docs/1';
const vapidBaseUrl =
  'https://s3-us-west-2.amazonaws.com/procore-api-documentation-production/master';

const supportLevels = [
  'internal',
  'alpha',
  'beta',
  'production',
];

function defaultFilter(group) {
  const { highest_support_level: groupLevel } = group;
  const groupIndex = supportLevels.indexOf(groupLevel);
  if (groupIndex < 0) {
    debug('Unrecognized highest_support_level %o', groupLevel);
  }
  return groupIndex >= 3;
}

/** Options for command entry points.
 *
 * @typedef {{
 *   agent: module.http.Agent,
 *   baseUrl: string,
 *   groupFilter: function(!object): boolean
 * }} FetchProcoreApiDocsOptions
 * @property {module:stream.Agent=} agent Agent for HTTP(S) requests.
 * @property {string=} baseUrl Base URL from which to download docs JSON.
 * @property {function(!object): boolean=} groupFilter Filter applied to
 * group objects before downloading.
 */
// const FetchProcoreApiDocsOptions;

/** Downloads Procore API documentation JSON files to a given directory.
 *
 * @param {FetchProcoreApiDocsOptions=} options Options.
 * @returns {!Promise<Array<module:promise.allsettled.PromiseResult>>}
 * Promise for results (in the format of Promise.allSettled) fulfilled with
 * undefined or rejected with Error.
 */
module.exports =
async function fetchProcoreApiDocs(options) {
  if (options !== undefined && typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }

  let baseUrl = (options && options.baseUrl) || restBaseUrl;
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const agent = options && options.agent;
  const fetchOptions = { agent };

  const groupsResponse =
    await fetchJson(`${baseUrl}/groups.json`, fetchOptions);
  const allGroups = await groupsResponse.json();

  const groupFilter = (options && options.groupFilter) || defaultFilter;
  const groups = allGroups.filter(groupFilter);

  return allSettled(groups.map((group) => {
    const filename = `${paramCase(group.name)}.json`;
    const url = `${baseUrl}/${filename}`;
    debug(`Downloading ${url}...`);
    return downloadJson(url, filename, fetchOptions);
  }));
};

/** Base URL for REST API documentation JSON. */
module.exports.restBaseUrl = restBaseUrl;

/** Base URL for Vapid API documentation JSON. */
module.exports.vapidBaseUrl = vapidBaseUrl;
