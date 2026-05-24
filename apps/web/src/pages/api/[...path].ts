import type { APIRoute } from 'astro';

export const ALL: APIRoute = async ({ request, params }) => {
  const apiUrl = import.meta.env.API_URL;
  const path = params.path ?? '';
  const url = new URL(request.url);
  const target = `${apiUrl}/${path}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit & { duplex?: string } = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  return fetch(new Request(target, init));
};
