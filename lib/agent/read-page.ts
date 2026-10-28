import 'server-only';

import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import ipaddr from 'ipaddr.js';
import { load } from 'cheerio';

const MAX_BYTES = 2 * 1024 * 1024;

export class PageReadError extends Error {}

export function publicUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new PageReadError('Only public HTTP(S) URLs on standard ports are supported.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host.includes('.') && !host.includes(':')) throw new PageReadError('A public hostname is required.');
  if (host === 'localhost' || /\.(localhost|local|internal)$/.test(host))
    throw new PageReadError('Private hosts are not allowed.');
  if (ipaddr.isValid(host) && ipaddr.process(host).range() !== 'unicast') {
    throw new PageReadError('Private and reserved addresses are not allowed.');
  }
  url.hash = '';
  return url;
}

async function download(url: URL, signal: AbortSignal) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  let onAbort = () => {};
  const addresses = await Promise.race([
    lookup(hostname, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => {
      if (signal.aborted) return reject(new PageReadError('Page retrieval timed out or was cancelled.'));
      onAbort = () => reject(new PageReadError('Page retrieval timed out or was cancelled.'));
      signal.addEventListener('abort', onAbort, { once: true });
    }),
  ]).finally(() => signal.removeEventListener('abort', onAbort));
  signal.throwIfAborted();
  if (!addresses.length || addresses.some(({ address }) => ipaddr.process(address).range() !== 'unicast')) {
    throw new PageReadError('The hostname resolves to a private or reserved address.');
  }
  const pinned = addresses[0];
  // Pin the validated address so a second DNS lookup cannot reach a private destination.
  return new Promise<{ status: number; location?: string; contentType: string; body: string }>((resolve, reject) => {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = request(
      url,
      {
        method: 'GET',
        signal,
        agent: false,
        family: pinned.family,
        lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
        headers: {
          'User-Agent': 'AuthAssist/0.1 (OAuth documentation research)',
          Accept: 'text/html,text/plain,application/xhtml+xml',
          'Accept-Encoding': 'identity',
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const contentType = String(response.headers['content-type'] ?? '');
        if ([301, 302, 303, 307, 308].includes(status)) {
          response.destroy();
          resolve({ status, location: response.headers.location, contentType, body: '' });
          return;
        }
        if (status !== 200 || !/^(text\/html|text\/plain|application\/xhtml\+xml)(;|$)/i.test(contentType)) {
          response.destroy();
          reject(
            new PageReadError(
              status !== 200
                ? `Page returned HTTP ${status}; access may be restricted.`
                : 'Unsupported page format. Only HTML and plain text are supported.',
            ),
          );
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            response.destroy(new PageReadError('Page exceeds the 2 MB retrieval limit.'));
          } else chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () => resolve({ status, contentType, body: Buffer.concat(chunks).toString('utf8') }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

export async function readPublicPage(value: string, parentSignal: AbortSignal) {
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(12_000)]);
  let url = publicUrl(value);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await download(url, signal);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location || redirects === 3)
        throw new PageReadError('Missing redirect location or redirect limit reached.');
      url = publicUrl(new URL(response.location, url).href);
      continue;
    }
    let title = url.hostname;
    let content = response.body;
    if (!response.contentType.startsWith('text/plain')) {
      const $ = load(response.body);
      title = $('title').first().text().trim() || title;
      if ($('input[type="password"]').length)
        throw new PageReadError('Login form encountered; a human may need to sign in.');
      $('script,style,noscript,svg,nav,header,footer,form').remove();
      const main = $('main,article,[role="main"]').first();
      const root = main.length ? main : $('body');
      root.find('p,div,li,h1,h2,h3,h4,tr,br').append('\n');
      content = root.text();
    }
    content = content
      .replace(/[\t ]+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    if (content.length < 100)
      throw new PageReadError('Not enough readable text; the page may require login or JavaScript.');
    return {
      url: url.href,
      title: title.slice(0, 300),
      content: content.slice(0, 16_000),
      truncated: content.length > 16_000,
    };
  }
  throw new PageReadError('Redirect limit reached.');
}
