/**
 * @copyright Copyright 2016-2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module fetch-procore-api-docs
 */

import { mkdir } from 'node:fs/promises';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import path from 'node:path';
import { debuglog } from 'node:util';

import downloadJson from './lib/download-json.js';
import fetchJson from './lib/fetch-json.js';

const debug = debuglog('fetch-procore-api-docs');

/** Default URL of resource groups to fetch. */
export const defaultResourceGroupsUrl =
  'https://developers.procore.com/api/v1/resource_groups?version=rest_v1';

/** Gets the last (i.e. latest) link (i.e. URL) from each resource group.
 *
 * @param {!Array<!object>} resourceGroups Resource groups for which to get
 * links to download.
 * @returns {!Array<string>} The last entry of the links Array for each group.
 */
// eslint-disable-next-line import/no-unused-modules
export function defaultGroupsToLinks(resourceGroups) {
  return resourceGroups.map(({ links }) => links[links.length - 1]);
}

/** Makes a function to get the path at which to save a given link (i.e. URL)
 * from the resource groups at a given URL.
 *
 * The returned function currently applies the following:
 * If the link is below {@code resourceGroupsUrl}, the relative path is used,
 * otherwise the full URL path is used.  In either case, the query string is
 * stripped and a .json extension is added if no extension is present.
 *
 * The returned path is guaranteed to be below (and relative to) the current
 * directory.
 *
 * @param {string|!URL} resourceGroupsUrl URL of resource groups for which
 * to make a linkToPath function.
 * @returns {function(!URL): string} Function to get the path at which to
 * save a given resource group link (URL).
 */
export function makeLinkToPath(resourceGroupsUrl) {
  let basePath = new URL(resourceGroupsUrl).pathname;
  if (!basePath.endsWith('/')) {
    basePath += '/';
  }

  return function linkToPath(link) {
    const { pathname } = link;
    const linkUrlPath = pathname.slice(
      pathname.startsWith(basePath) ? basePath.length : 1,
    );
    const linkFilePath = `./${decodeURIComponent(linkUrlPath)}`;
    const linkNormPath = path.normalize(linkFilePath);
    if (linkNormPath.startsWith(`..${path.sep}`)) {
      throw new Error(`link (${link}) resolved to path (${
        linkNormPath}) outside working directory`);
    }

    const linkExtPath =
      // If the path doesn't have a file name, use 'index.json'
      linkNormPath.endsWith(path.sep) ? 'index.json'
        // If the path does not have an extension, add .json
        : !path.extname(linkNormPath) ? `${linkNormPath}.json`
          : linkNormPath;

    return linkExtPath;
  };
}

async function downloadJsonMkdir(url, filename, fetchOptions, fileOptions) {
  const dirname = path.dirname(filename);
  if (dirname !== '.') {
    await mkdir(dirname, { recursive: true });
  }

  return downloadJson(url, filename, fetchOptions, fileOptions);
}

/** Options for command entry points.
 *
 * @typedef {{
 *   agent: module:http.Agent,
 *   fileOptions: module:fs.WriteFileOptions,
 *   groupsToLinks: function(Array<!object>!): !Iterable<string>,
 *   linkToPath: function(string): string,
 *   resourceGroupsUrl: string|!URL
 * }} FetchProcoreApiDocsOptions
 * @property {module:stream.Agent=} agent Agent for HTTP(S) requests.
 * @property {module:fs.WriteFileOptions=} fileOptions Options for JSON file
 * creation.
 * @property {function(Array<!object>!): !Iterable<string|!URL>=} groupsToLinks
 * Function to get links (i.e. URLs) to download for a given Array of resource
 * groups.  (default: {@link defaultGroupsToLinks})
 * @property {function(!URL): string=} linkToPath Function to get the path at
 * which to save a given resource group link.  (default: result of
 * {@link makeLinkToPath} for {@link #resourceGroupsUrl})
 * @property {string|!URL=} resourceGroupsUrl URL of resource groups to fetch.
 * (default: {@link defaultResourceGroupsUrl}
 */
// const FetchProcoreApiDocsOptions;

/** Downloads Procore API documentation.
 *
 * @param {FetchProcoreApiDocsOptions=} options Options.
 * @returns {!Promise<Array<module:promise.allsettled.PromiseResult>>}
 * Promise for results (in the format of Promise.allSettled) fulfilled with
 * undefined or rejected with Error.
 */
export default async function fetchProcoreApiDocs({
  agent,
  fileOptions,
  groupsToLinks = defaultGroupsToLinks,
  linkToPath,
  resourceGroupsUrl = defaultResourceGroupsUrl,
} = {}) {
  // Early URL validation
  if (!(resourceGroupsUrl instanceof URL)) {
    resourceGroupsUrl = new URL(resourceGroupsUrl);
  }

  if (linkToPath === undefined) {
    linkToPath = makeLinkToPath(resourceGroupsUrl);
  } else if (typeof linkToPath !== 'function') {
    throw new TypeError('linkToPath must be a function');
  }

  // If the caller did not provide an agent, use one with keep-alive
  // (scoped to this function call) to avoid reconnecting for each request.
  let createdAgent;
  if (agent === undefined) {
    const { protocol } = resourceGroupsUrl;
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
    const groupsResponse = await fetchJson(resourceGroupsUrl, fetchOptions);
    const groups = await groupsResponse.json();
    const groupLinks = groupsToLinks(groups);

    return await Promise.allSettled(groupLinks.map((link) => {
      const absLink = new URL(link, resourceGroupsUrl);
      const filename = linkToPath(absLink);
      debug(`Downloading ${absLink} to ${filename}...`);
      return downloadJsonMkdir(absLink, filename, fetchOptions, fileOptions);
    }));
  } finally {
    if (createdAgent) {
      createdAgent.destroy();
    }
  }
}
