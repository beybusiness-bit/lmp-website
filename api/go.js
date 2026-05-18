// 숏링크 리다이렉터 — Firestore에서 shortPath 조회 후 UTM URL로 302 리다이렉트
export default async function handler(req, res) {
  const urlPath = (req.url || '').split('?')[0]; // e.g. /go/닉네임

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
            value: { stringValue: urlPath }
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
