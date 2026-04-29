const ALLOWED_HOST = 'www.vivaicintoli.com';

export default async function handler(req, res) {
  const { src } = req.query || {};

  if (!src) {
    return res.status(400).send('Missing src');
  }

  let parsed;
  try {
    parsed = new URL(src);
  } catch {
    return res.status(400).send('Invalid URL');
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return res.status(403).send('Forbidden');
  }

  try {
    const upstream = await fetch(src, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VivaiCintoliApp/1.0)',
        'Referer': 'https://www.vivaicintoli.com/',
      },
    });

    if (!upstream.ok) {
      return res.status(404).send('Image not found');
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(500).send('Proxy error');
  }
}
