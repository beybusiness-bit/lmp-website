// 페이업(Payup) 결제 승인 서버 엔드포인트
// 1. accessToken 발급
// 2. 결제 승인 API 호출
// 3. 결과에 따라 tools/payment/ 로 리다이렉트
export default async function handler(req, res) {
  const IS_TEST = process.env.PAYUP_TEST === 'true';
  const BASE    = IS_TEST
    ? 'https://standard.testpayup.co.kr'
    : 'https://standard.payup.co.kr';

  // PC: form POST body (application/x-www-form-urlencoded)
  // 모바일: returnUrl GET 쿼리
  const query = req.query || {};

  // Vercel이 form body를 자동 파싱하지 않을 수 있으므로 직접 파싱
  let body = req.body || {};
  if (req.method === 'POST') {
    if (typeof body === 'string' && body) {
      body = Object.fromEntries(new URLSearchParams(body));
    } else if (Buffer.isBuffer(body)) {
      body = Object.fromEntries(new URLSearchParams(body.toString('utf8')));
    }
  }

  // PayUp이 보내는 파라미터 이름 (tid / transaction_id 등 대안 포함)
  const transactionId = body.transactionId || query.transactionId ||
                        body.tid           || query.tid           ||
                        body.transaction_id|| query.transaction_id|| '';
  const orderNumber   = body.orderNumber   || query.orderNumber   ||
                        body.orderId       || query.orderId       ||
                        body.order_id      || query.order_id      || '';
  const amount        = body.amount        || query.amount        ||
                        body.amt           || query.amt           || '';
  const configId      = body.configId      || query.id            || '';
  const projectId     = body.projectId     || query.projectId     || '';
  const userId        = body.userId        || query.userId        || '';

  const toolBase = `/tools/payment/?id=${encodeURIComponent(configId)}`;
  const fail = (msg) =>
    res.redirect(`${toolBase}&result=fail&message=${encodeURIComponent(msg)}&projectId=${encodeURIComponent(projectId)}&userId=${encodeURIComponent(userId)}`);

  if (!transactionId || !orderNumber || !amount) {
    const dbg = JSON.stringify({
      qKeys: Object.keys(query),
      bKeys: Object.keys(body),
      method: req.method,
      ct: (req.headers['content-type'] || '').split(';')[0],
    });
    return fail('결제 정보 누락: ' + dbg);
  }

  try {
    // Step 1 — accessToken 발급
    const tokenRes = await fetch(`${BASE}/auth/v1/accessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: process.env.PAYUP_MERCHANT_ID,
        apiKey:     process.env.PAYUP_API_KEY,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.status !== 'SUCCESS') {
      return fail('인증 토큰 발급 실패: ' + (tokenData.message || ''));
    }
    const accessToken = tokenData.data?.accessToken;

    // Step 2 — 결제 승인
    const payRes = await fetch(`${BASE}/api/v1/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken,
      },
      body: JSON.stringify({
        transactionId,
        merchantId:  process.env.PAYUP_MERCHANT_ID,
        orderNumber,
        amount,
      }),
    });
    const payData = await payRes.json();

    if (payData.status === 'SUCCESS' && payData.data?.responseCode === '0000') {
      const d = payData.data;
      const params = new URLSearchParams({
        id:            configId,
        result:        'success',
        transactionId: d.transactionId  || transactionId,
        amount:        d.amount         || amount,
        cardName:      d.issueCompanyName || '',
        authDatetime:  d.authDatetime   || '',
        authNumber:    d.authNumber     || '',
        projectId,
        userId,
      });
      return res.redirect(`/tools/payment/?${params.toString()}`);
    }

    return fail(payData.data?.responseMsg || payData.message || '결제 승인 실패');
  } catch (e) {
    return fail(e.message || '서버 오류가 발생했어요.');
  }
}
