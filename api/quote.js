export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const key = process.env.RESEND_KEY;
  if (!key) {
    return res.status(503).json({ error: 'RESEND_KEY not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { client, plants } = body || {};

  if (!plants || !plants.length) {
    return res.status(400).json({ error: 'No plants in quote' });
  }

  const rows = plants.map((p, i) =>
    `<tr style="border-bottom:1px solid #E8DCC8">
      <td style="padding:8px 12px;font-size:12px">${i + 1}</td>
      <td style="padding:8px 12px">
        <strong style="font-size:13px">${p.name}</strong><br>
        <em style="font-size:11px;color:#666">${p.sci}</em>
        ${p.note ? `<br><span style="font-size:11px;color:#888">${p.note}</span>` : ''}
      </td>
      <td style="padding:8px 12px;text-align:center;font-size:13px">${p.qty}</td>
      <td style="padding:8px 12px;text-align:center;font-size:11px;color:#666">${p.stock}</td>
    </tr>`
  ).join('');

  const totalQty = plants.reduce((s, p) => s + p.qty, 0);
  const today = new Date().toLocaleDateString('it-IT');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Helvetica,Arial,sans-serif;color:#2C2C2C;max-width:700px;margin:0 auto;padding:24px">
  <div style="border-bottom:3px solid #4A5D23;padding-bottom:16px;margin-bottom:24px">
    <div style="font-size:22px;font-weight:700;color:#3A4A1B">VIVAI CINTOLI</div>
    <div style="font-size:11px;color:#666">C.da Caselunghe, 70 — 97018 Cava d'Aliga (RG) — Sicilia</div>
    <div style="font-size:13px;font-weight:700;color:#C4623A;margin-top:8px">NUOVO PREVENTIVO — Fiera Zagreb 2026 — ${today}</div>
  </div>
  <div style="background:#F5EDE0;padding:16px;border-radius:6px;margin-bottom:20px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4A5D23;margin-bottom:8px">Cliente</div>
    ${client.name ? `<div style="font-size:13px;font-weight:600">${client.name}</div>` : ''}
    ${client.company ? `<div style="font-size:12px;color:#555">${client.company}</div>` : ''}
    ${client.vat ? `<div style="font-size:11px;color:#666">P.IVA/VAT: ${client.vat}</div>` : ''}
    ${client.email ? `<div style="font-size:11px;color:#666">${client.email}</div>` : ''}
    ${client.phone ? `<div style="font-size:11px;color:#666">${client.phone}</div>` : ''}
    ${client.country ? `<div style="font-size:11px;color:#666">${client.country}</div>` : ''}
    ${client.notes ? `<div style="font-size:11px;color:#666;margin-top:8px;font-style:italic">${client.notes}</div>` : ''}
    <div style="margin-top:8px;font-size:12px"><strong>${plants.length}</strong> specie — <strong>${totalQty}</strong> piante totali</div>
  </div>
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:#3A4A1B;color:#fff">
        <th style="padding:10px 12px;font-size:11px;text-align:left;width:30px">#</th>
        <th style="padding:10px 12px;font-size:11px;text-align:left">Specie</th>
        <th style="padding:10px 12px;font-size:11px;text-align:center;width:60px">Qtà</th>
        <th style="padding:10px 12px;font-size:11px;text-align:center;width:80px">Stock</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:24px;font-size:11px;color:#888;border-top:1px solid #E8DCC8;padding-top:12px">
    Preventivo ricevuto tramite app fiera — Vivai Cintoli Srl — Zagabria 2026
  </div>
</body>
</html>`;

  const subject = `Preventivo Fiera Zagreb 2026 — ${client.name || client.company || client.email || 'Anonimo'}`;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // use Resend sandbox until domain is verified
        to: ['vivaicintolisrl@gmail.com'],
        reply_to: client.email || undefined,
        subject,
        html,
      }),
    });

    const data = await resendRes.json();

    if (!resendRes.ok) {
      return res.status(resendRes.status).json({ error: data.message || 'Resend error' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
