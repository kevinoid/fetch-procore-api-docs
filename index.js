/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module fetch-procore-api-docs
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import path from 'path';
import { debuglog } from 'util';

import downloadJson from './lib/download-json.js';
import fetchJson from './lib/fetch-json.js';
import groupNameToUrlPath from './lib/group-name-to-url-path.js';

const debug = debuglog('fetch-procore-api-docs');

/** Base URL for REST API documentation JSON. */
// eslint-disable-next-line import/no-unused-modules
export const restBaseUrl =
  'https://s3-us-west-2.amazonaws.com/procore-api-documentation-production/master/rest_docs/1';

/** Base URL for Vapid API documentation JSON. */
// eslint-disable-next-line import/no-unused-modules
export const vapidBaseUrl =
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
 *   agent: module:http.Agent,
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
export default async function fetchProcoreApiDocs(options) {
  if (options !== undefined && typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }

  // Note: path.join() throws for undefined or null.
  const baseDir = options?.baseDir ?? '.';
  if (typeof baseDir !== 'string') {
    throw new TypeError('options.baseDir must be a string');
  }

  let baseUrl = options?.baseUrl ?? defaultBaseUrl;
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  // If the caller did not provide an agent, use one with keep-alive
  // (scoped to this function call) to avoid reconnecting for each request.
  let agent = options?.agent;
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

    const groupFilter = options?.groupFilter ?? defaultFilter;
    const groups = allGroups.filter(groupFilter);

    return await Promise.allSettled(groups.map((group) => {
      const filename =
        path.join(baseDir, `${groupNameToUrlPath(group.name)}.json`);
      const url = `${baseUrl}/${filename}`;
      debug(`Downloading ${url} to ${filename}...`);
      return downloadJson(
        url,
        filename,
        fetchOptions,
        options?.fileOptions,
      );
    }));
  } finally {
    if (createdAgent) {
      createdAgent.destroy();
    }
  }
}
