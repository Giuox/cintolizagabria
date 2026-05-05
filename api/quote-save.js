export const config = { maxDuration: 30 };

function generateCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CIN-${num}`;
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

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
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/quotes?code=eq.${candidate}&select=code`,
        { headers }
      );
      const existing = await checkRes.json();
      if (!existing.length) { code = candidate; break; }
    }
    if (!code) return res.status(500).json({ error: 'Could not generate unique code' });

    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/quotes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code, plants, client, expires_at: expiresAt }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.json().catch(() => ({}));
      return res.status(500).json({ error: err.message || 'Insert failed' });
    }

    return res.status(200).json({ code });
  }

  // ── RETRIEVE ──
  if (req.method === 'GET') {
    const code = (req.query.code || '').toUpperCase().trim();
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/quotes?code=eq.${encodeURIComponent(code)}&select=plants,client,expires_at`,
      { headers }
    );
    const rows = await getRes.json();

    if (!rows.length) {
      return res.status(404).json({ error: 'Quote not found or expired' });
    }

    const row = rows[0];
    // Check expiry
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(404).json({ error: 'Quote expired' });
    }

    return res.status(200).json({ plants: row.plants, client: row.client });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
