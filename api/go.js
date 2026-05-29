// 숏링크 리다이렉터 — Firestore에서 shortPath 조회 후 UTM URL로 302 리다이렉트
// vercel.json rewrite가 prefix/slug를 쿼리파라미터로 전달함
export default async function handler(req, res) {
  const prefix = (req.query.prefix || '').trim();
  const slug   = (req.query.slug   || '').trim();
  if (!prefix || !slug) return res.redirect(302, '/');

  // 시스템 경로 — catch-all이 가로챈 경우 올바른 페이지 HTML을 직접 서빙
  // (Vercel이 rewrite 순서를 보장하지 않아 catch-all이 먼저 매칭될 수 있음)
  const SYSTEM_PAGES = { studio: '/studio', booth: '/studio', check: '/check' };
  if (SYSTEM_PAGES[prefix]) {
    const base = `https://${req.headers.host || 'lazymaxpotential.kr'}`;
    try {
      const r = await fetch(base + SYSTEM_PAGES[prefix], { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const html = await r.text();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(html);
      }
    } catch(e) { /* fallthrough */ }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>오류</title></head><body style="font-family:sans-serif;text-align:center;padding:60px 20px"><p>페이지를 불러올 수 없습니다.<br>잠시 후 다시 시도해주세요.</p></body></html>');
  }

  const shortPath = '/' + prefix + '/' + slug;

  const fbProject = 'beyhome-admin';
  const fbApiKey  = process.env.FIREBASE_API_KEY || 'AIzaSyC8uy09XOeEYIs1m3Rga5BMqd7gS7o3roI';

  try {
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${fbProject}/databases/(default)/documents:runQuery?key=${encodeURIComponent(fbApiKey)}`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'cms_utm_links' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'shortPath' },
            op: 'EQUAL',
            value: { stringValue: shortPath }
          }
        },
        limit: 1
      }
    };
    const resp = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000)
    });
    if (resp.ok) {
      const data = await resp.json();
      const doc = data[0]?.document;
      if (doc) {
        const utmUrl = doc.fields?.utmUrl?.stringValue;
        if (utmUrl) {
          res.setHeader('Cache-Control', 'public, s-maxage=60, max-age=10');
          return res.redirect(302, utmUrl);
        }
      }
    }
  } catch (e) { /* 타임아웃 등 에러 → 홈으로 */ }

  return res.redirect(302, '/');
}
