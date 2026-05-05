import { kv } from '@vercel/kv';

export const config = { maxDuration: 30 };

// Generate a short human-readable code like CIN-4827
function generateCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CIN-${num}`;
}

export default async function handler(req, res) {
  // ── SAVE ──
  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { plants, client } = body || {};
    if (!plants || !plants.length) {
      return res.status(400).json({ error: 'No plants in quote' });
    }

    // Try up to 5 times to get a unique code
    let code;
    for (let i = 0; i < 5; i++) {
      const candidate = generateCode();
      const exists = await kv.exists(`quote:${candidate}`);
      if (!exists) { code = candidate; break; }
    }
    if (!code) return res.status(500).json({ error: 'Could not generate unique code' });

    const payload = {
      plants,
      client,
      createdAt: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
    };

    // Store for 90 days
    await kv.set(`quote:${code}`, JSON.stringify(payload), { ex: 60 * 60 * 24 * 90 });

    return res.status(200).json({ code });
  }

  // ── RETRIEVE ──
  if (req.method === 'GET') {
    const code = (req.query.code || '').toUpperCase().trim();
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const raw = await kv.get(`quote:${code}`);
    if (!raw) return res.status(404).json({ error: 'Quote not found or expired' });

    let data;
    try {
      data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return res.status(500).json({ error: 'Corrupted data' });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
