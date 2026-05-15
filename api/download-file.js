export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).end('url required');

  let decoded;
  try { decoded = decodeURIComponent(url); } catch { decoded = url; }

  try {
    const upstream = await fetch(decoded);
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    // Firebase Storage 경로에서 파일명 추출
    // 예: .../o/forms%2Fuploads%2F1234_파일.pdf?alt=media&token=...
    const pathPart = decoded.split('?')[0];
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
