import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const ALL: APIRoute = async ({ request, params }) => {
  const api = (env as unknown as { API: Fetcher }).API;
  const path = params.path ?? '';
  const url = new URL(request.url);
  const target = new URL(`/${path}${url.search}`, 'https://api');

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit & { duplex?: string } = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  return api.fetch(new Request(target, init));
};
