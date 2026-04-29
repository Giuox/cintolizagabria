export default async function handler(req, res) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'MAPBOX_TOKEN not configured' });
  }

  const { geocode } = req.query || {};

  // Geocoding proxy
  if (geocode) {
    const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geocode)}.json?access_token=${token}&limit=1`;
    const mbRes = await fetch(mbUrl);
    const data = await mbRes.json();
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(data);
  }

  // Token request (for mapbox-gl-js init)
  return res.status(200).json({ token });
}
