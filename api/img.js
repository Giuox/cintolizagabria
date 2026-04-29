export const config = { runtime: 'edge' };

const ALLOWED_HOST = 'www.vivaicintoli.com';

export default async function handler(req) {
  const url = new URL(req.url, 'http://localhost');
  const src = url.searchParams.get('src');

  if (!src) {
    return new Response('Missing src', { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(src);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  // Only proxy images from the allowed host
  if (parsed.hostname !== ALLOWED_HOST) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const res = await fetch(src, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VivaiCintoliApp/1.0)',
        'Referer': 'https://www.vivaicintoli.com/',
      },
    });

    if (!res.ok) {
      return new Response('Image not found', { status: 404 });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const body = await res.arrayBuffer();

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response('Proxy error', { status: 500 });
  }
}
