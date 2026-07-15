import { Hono } from 'hono';

const app = new Hono();

app.get('/', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ detail: 'url query param required' }, 400);

  // Security: only allow R2 URLs
  if (!url.includes('.r2.cloudflarestorage.com') && !url.includes('.r2.dev')) {
    return c.json({ detail: 'Invalid image source' }, 400);
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      return c.json({ detail: `Upstream error ${res.status}` }, res.status as any);
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = await res.arrayBuffer();

    return c.body(buffer, 200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (err: any) {
    console.error('[ImageProxy] Failed to fetch:', url, err.message);
    return c.json({ detail: 'Failed to fetch image' }, 500);
  }
});

export default app;
