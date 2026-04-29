// Node.js runtime — needed for longer timeout (image generation can take 30-60s)
// Edge runtime has a 25s hard limit which is too short for OpenAI image edits

export const config = {
  maxDuration: 120, // seconds — requires Vercel Pro, falls back to 60s on Hobby
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const key = process.env.OPENAI_KEY;
  if (!key) {
    return res.status(503).json({ error: 'OPENAI_KEY not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { image, prompt } = body || {};

  if (!image || !prompt) {
    return res.status(400).json({ error: 'Missing image or prompt' });
  }

  // Extract base64 from data URL
  const base64Match = image.match(/^data:(.+?);base64,(.+)$/);
  if (!base64Match) {
    return res.status(400).json({ error: 'Invalid image format' });
  }

  const mimeType = base64Match[1];
  const imgBase64 = base64Match[2];

  try {
    // Convert base64 to Buffer
    const imgBuffer = Buffer.from(imgBase64, 'base64');

    // Build multipart/form-data manually using boundary
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

    const parts = [];

    // model field
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-2`
    );

    // prompt field
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${prompt}`
    );

    // n field
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1`
    );

    // size field
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n1024x1024`
    );

    // image[] file field
    const imgHeader = `--${boundary}\r\nContent-Disposition: form-data; name="image[]"; filename="image.jpg"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const imgFooter = `\r\n--${boundary}--\r\n`;

    const headerBuf = Buffer.from(parts.join('\r\n') + '\r\n' + imgHeader, 'utf8');
    const footerBuf = Buffer.from(imgFooter, 'utf8');
    const formBody = Buffer.concat([headerBuf, imgBuffer, footerBuf]);

    const openaiRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(formBody.length),
      },
      body: formBody,
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error('OpenAI error:', data);
      return res.status(openaiRes.status).json({
        error: data.error?.message || 'OpenAI API error',
      });
    }

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(500).json({ error: 'No image in response' });
    }

    return res.status(200).json({
      image: `data:image/png;base64,${b64}`,
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
