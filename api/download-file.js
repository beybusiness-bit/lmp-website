// Firebase Storage URL만 허용 — SSRF 방지
const ALLOWED_STORAGE_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
];
function isAllowedStorageUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_STORAGE_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  } catch { return false; }
}

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).end('url required');

  // Vercel query parser already decodes once — do NOT decodeURIComponent again
  // (would turn %2F in Firebase Storage paths to / and break the URL)
  if (!isAllowedStorageUrl(url)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    const pathPart = url.split('?')[0];
    const encodedName = pathPart.split('%2F').pop() || pathPart.split('/').pop() || 'file';
    let filename;
    try { filename = decodeURIComponent(encodedName); } catch { filename = encodedName; }
    filename = filename.replace(/^\d+_/, '') || 'file';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-store');

    const buf = await upstream.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
