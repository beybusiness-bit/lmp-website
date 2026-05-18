// Firebase Storage 이미지 프록시 — Canvas export용 CORS 우회
// 서버 사이드 fetch는 CORS 제한 없음 → 응답에 CORS 헤더 추가해서 반환
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).end('url required');

  const decoded = url; // Vercel req.query already URL-decoded once

  // Firebase Storage URL만 허용 (오픈 프록시 방지)
  if (!decoded.startsWith('https://firebasestorage.googleapis.com/')) {
    return res.status(403).json({ error: 'Only Firebase Storage URLs allowed' });
  }

  try {
    const upstream = await fetch(decoded, { redirect: 'follow' });
    if (!upstream.ok) {
      return res.status(502).json({ error: `upstream ${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) {
      return res.status(502).json({ error: `unexpected content-type: ${contentType}` });
    }

    const bytes = new Uint8Array(await upstream.arrayBuffer());
    const buf = Buffer.from(bytes);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
    return res.status(200).end(buf);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
