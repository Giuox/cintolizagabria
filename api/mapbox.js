export default async function handler(req) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'MAPBOX_TOKEN not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url, 'http://localhost');
  const geocode = url.searchParams.get('geocode');

  // Geocoding proxy
  if (geocode) {
    const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geocode)}.json?access_token=${token}&limit=1`;
    const mbRes = await fetch(mbUrl);
    const data = await mbRes.json();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Token request (for mapbox-gl-js init)
  return new Response(JSON.stringify({ token }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
