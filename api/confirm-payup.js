// 페이업(Payup) 결제 승인 서버 엔드포인트
// Mode A: JSON POST (fetch from payupPaymentSubmit) → JSON 응답
// Mode B: GET/form-POST (브라우저 리다이렉트) → redirect 응답
export default async function handler(req, res) {
  const IS_TEST = process.env.PAYUP_TEST === 'true';
  const BASE    = IS_TEST
    ? 'https://standard.testpayup.co.kr'
    : 'https://standard.payup.co.kr';

  const query = req.query || {};
  const ct    = (req.headers['content-type'] || '').split(';')[0].trim();
  const isJsonMode = req.method === 'POST' && ct === 'application/json';

  let body = req.body || {};
  if (req.method === 'POST') {
    if (isJsonMode) {
      if (typeof body === 'string' && body) {
        try { body = JSON.parse(body); } catch(e) { body = {}; }
      }
    } else if (ct === 'application/x-www-form-urlencoded') {
      if (typeof body === 'string' && body) {
        body = Object.fromEntries(new URLSearchParams(body));
      } else if (Buffer.isBuffer(body)) {
        body = Object.fromEntries(new URLSearchParams(body.toString('utf8')));
      }
    }
  }

  // PayUp 파라미터 이름 통일 (여러 가능한 이름 처리)
  const transactionId = body.transactionId || query.transactionId ||
                        body.tid           || query.tid           ||
                        body.transaction_id|| query.transaction_id||
                        body.TID           || query.TID           || '';
  const orderNumber   = body.orderNumber   || query.orderNumber   ||
                        body.orderNo       || query.orderNo       ||
                        body.orderId       || query.orderId       ||
                        body.order_id      || query.order_id      ||
                        body.ORDER_NO      || query.ORDER_NO      || '';
  const amount        = body.amount        || query.amount        ||
                        body.amt           || query.amt           ||
                        body.AMOUNT        || query.AMOUNT        || '';
  const configId      = body.configId      || query.id            || '';
  const projectId     = body.projectId     || query.projectId     || '';
  const userId        = body.userId        || query.userId        || '';

  const toolBase = `/tools/payment/?id=${encodeURIComponent(configId)}`;

  const fail = (msg) => isJsonMode
    ? res.status(200).json({ success: false, message: msg })
    : res.redirect(`${toolBase}&result=fail&message=${encodeURIComponent(msg)}&projectId=${encodeURIComponent(projectId)}&userId=${encodeURIComponent(userId)}`);

  if (!transactionId || !orderNumber || !amount) {
    console.error('[confirm-payup] missing params', {
      isJsonMode, method: req.method, ct,
      qKeys: Object.keys(query), bKeys: Object.keys(body),
      tid: !!transactionId, orderNo: !!orderNumber, amt: !!amount,
      allBodyKeys: Object.keys(body),
    });
    return fail('결제가 완료되지 않았어요. 결제창에서 취소하셨거나 오류가 발생했어요.');
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
      if (isJsonMode) {
        return res.status(200).json({
          success: true,
          data: {
            transactionId: d.transactionId  || transactionId,
            amount:        d.amount         || amount,
            cardName:      d.issueCompanyName || '',
            authDatetime:  d.authDatetime   || '',
            authNumber:    d.authNumber     || '',
          },
        });
      }
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
