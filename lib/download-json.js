/**
 * @copyright Copyright 2016-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

import { createWriteStream } from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

import { hasAppend, hasExcl, hasWronly } from './check-fs-flags.js';
import fetchJson from './fetch-json.js';

export default function downloadJson(
  url,
  filename,
  fetchOptions,
  { flags = 'wx', mode } = {},
) {
  // If flags doesn't include O_WRONLY, .write() fails with a cryptic
  // 'error' after 'open' (which also complicates error handling).
  // Abort early with a comprehensible error.
  if (!hasWronly(flags)) {
    throw new RangeError('flags must include a, w, or O_WRONLY');
  }

  // If flags has O_EXCL or O_APPEND, write directly to destination.
  // Otherwise, write to .part file and rename after complete download.
  const partFilename =
    hasExcl(flags) || hasAppend(flags) ? filename : `${filename}.part`;
  const writer = createWriteStream(partFilename, { flags, mode });

  async function onOpen() {
    try {
      const response = await fetchJson(url, fetchOptions);
      await pipeline(response.body, writer);
      if (partFilename !== filename) {
        await rename(partFilename, filename);
      }
    } catch (err) {
      if (!hasAppend(flags)) {
        await unlink(partFilename);
      }
      throw err;
    }
  }

  return new Promise((resolve, reject) => {
    writer.once('error', reject);
    writer.once('open', () => {
      writer.removeListener('error', reject);
      resolve(onOpen());
    });
  });
}
