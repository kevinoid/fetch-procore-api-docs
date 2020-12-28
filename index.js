/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module fetch-procore-api-docs
 */

'use strict';

const { Agent: HttpAgent } = require('http');
const { Agent: HttpsAgent } = require('https');
const { paramCase } = require('param-case');
const path = require('path');
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
 *   baseDir: string,
 *   baseUrl: string,
 *   fileOptions: module:fs.WriteFileOptions,
 *   groupFilter: function(!object): boolean
 * }} FetchProcoreApiDocsOptions
 * @property {module:stream.Agent=} agent Agent for HTTP(S) requests.
 * @property {string=} baseDir Directory where download JSON files are saved.
 * @property {string=} baseUrl Base URL from which to download docs JSON.
 * @property {module:fs.WriteFileOptions=} fileOptions Options for JSON file
 * creation.
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

  // Note: path.join() throws for undefined or null.
  const baseDir = (options && options.baseDir) || '.';
  if (typeof baseDir !== 'string') {
    throw new TypeError('options.baseDir must be a string');
  }

  let baseUrl = (options && options.baseUrl) || restBaseUrl;
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  // If the caller did not provide an agent, use one with keep-alive
  // (scoped to this function call) to avoid reconnecting for each request.
  let agent = options && options.agent;
  let createdAgent;
  if (!agent) {
    const { protocol } = new URL(baseUrl);
    const Agent = protocol === 'https' ? HttpsAgent
      : protocol === 'http' ? HttpAgent
        : undefined;
    if (Agent) {
      createdAgent = new Agent({ keepAlive: true });
      agent = createdAgent;
    }
  }

  const fetchOptions = { agent };

  try {
    const groupsResponse =
      await fetchJson(`${baseUrl}/groups.json`, fetchOptions);
    const allGroups = await groupsResponse.json();

    const groupFilter = (options && options.groupFilter) || defaultFilter;
    const groups = allGroups.filter(groupFilter);

    return await allSettled(groups.map((group) => {
      const filename = path.join(baseDir, `${paramCase(group.name)}.json`);
      const url = `${baseUrl}/${filename}`;
      debug(`Downloading ${url} to ${filename}...`);
      return downloadJson(
        url,
        filename,
        fetchOptions,
        options && options.fileOptions,
      );
    }));
  } finally {
    if (createdAgent) {
      createdAgent.destroy();
    }
  }
};

/** Base URL for REST API documentation JSON. */
module.exports.restBaseUrl = restBaseUrl;

/** Base URL for Vapid API documentation JSON. */
module.exports.vapidBaseUrl = vapidBaseUrl;
