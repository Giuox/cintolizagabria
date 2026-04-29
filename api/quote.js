export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = process.env.RESEND_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'RESEND_KEY not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { client, plants, lang } = body;

    // Build HTML email
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
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #4A5D23;padding-bottom:16px;margin-bottom:24px">
    <div>
      <div style="font-size:22px;font-weight:700;color:#3A4A1B">VIVAI CINTOLI</div>
      <div style="font-size:11px;color:#666">C.da Caselunghe, 70 — 97018 Cava d'Aliga (RG) — Sicilia</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:15px;font-weight:700;color:#C4623A">NUOVO PREVENTIVO</div>
      <div style="font-size:11px;color:#666">Data: ${today} — Fiera Zagreb 2026</div>
    </div>
  </div>

  <div style="display:flex;gap:20px;margin-bottom:24px">
    <div style="flex:1;background:#F5EDE0;padding:16px;border-radius:6px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4A5D23;margin-bottom:8px">Cliente</div>
      ${client.name ? `<div style="font-size:13px;font-weight:600">${client.name}</div>` : ''}
      ${client.company ? `<div style="font-size:12px;color:#555">${client.company}</div>` : ''}
      ${client.vat ? `<div style="font-size:11px;color:#666">P.IVA/VAT: ${client.vat}</div>` : ''}
      ${client.email ? `<div style="font-size:11px;color:#666">${client.email}</div>` : ''}
      ${client.phone ? `<div style="font-size:11px;color:#666">${client.phone}</div>` : ''}
      ${client.country ? `<div style="font-size:11px;color:#666">${client.country}</div>` : ''}
    </div>
    <div style="flex:1;background:#FAFDF5;padding:16px;border-radius:6px;border:1px solid rgba(74,93,35,0.2)">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4A5D23;margin-bottom:8px">Riepilogo</div>
      <div style="font-size:13px"><strong>${plants.length}</strong> specie</div>
      <div style="font-size:13px"><strong>${totalQty}</strong> piante totali</div>
      ${client.notes ? `<div style="font-size:11px;color:#666;margin-top:8px;font-style:italic">${client.notes}</div>` : ''}
    </div>
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

  <div style="margin-top:32px;padding-top:16px;border-top:2px solid #E8DCC8;font-size:11px;color:#888">
    Preventivo ricevuto tramite app fiera — Vivai Cintoli Srl — Fiera Internazionale del Verde, Zagabria 2026
  </div>
</body>
</html>`;

    const subject = `Preventivo Fiera Zagreb 2026 — ${client.name || client.company || client.email || 'Anonimo'}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'preventivi@vivaicintoli.com',
        to: ['vivaicintolisrl@gmail.com'],
        reply_to: client.email || undefined,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.message || 'Resend error' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
