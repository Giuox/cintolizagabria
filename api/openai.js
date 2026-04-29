export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = process.env.OPENAI_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'OPENAI_KEY not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { image, prompt } = await req.json();

    // Extract base64 data from data URL
    const base64Match = image.match(/^data:(.+?);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: 'Invalid image format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const mimeType = base64Match[1];
    const imgBase64 = base64Match[2];

    // Call OpenAI gpt-image-1 for image editing
    const openaiRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-2',
        image: imgBase64,
        prompt: prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}));
      return new Response(JSON.stringify({
        error: err.error?.message || 'OpenAI API error',
      }), {
        status: openaiRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await openaiRes.json();

    // gpt-image-1 returns base64 in data[0].b64_json
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ error: 'No image generated' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      image: `data:image/png;base64,${b64}`,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: 'Proxy error',
      detail: err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
