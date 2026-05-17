// 페이업(Payup) 결제 승인 서버 엔드포인트
// Mode A: JSON POST (fetch from payupPaymentSubmit) → JSON 응답
// Mode B: GET/form-POST (브라우저 리다이렉트) → HTML + JS redirect (빈화면 방지)
export default async function handler(req, res) {
  const _htmlRedirect = (url) => {
    const safeUrl = JSON.stringify(url);
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>body{font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-size:14px;color:rgba(0,0,0,.5);font-weight:600;text-align:center;}</style>` +
      `</head><body>결제 처리 중…<script>location.replace(${safeUrl});</script></body></html>`
    );
  };
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
  const qty           = Math.max(1, parseInt(body.qty        || query.qty        || '1') || 1);
  const optionLabel   = body.optionLabel   || query.optionLabel   || '';

  const toolBase = `/tools/payment/?id=${encodeURIComponent(configId)}`;

  const fail = (msg) => isJsonMode
    ? res.status(200).json({ success: false, message: msg })
    : _htmlRedirect(`${toolBase}&result=fail&message=${encodeURIComponent(msg)}&projectId=${encodeURIComponent(projectId)}&userId=${encodeURIComponent(userId)}`);

  if (!transactionId || !orderNumber || !amount) {
    console.error('[confirm-payup] missing params', {
      isJsonMode, method: req.method, ct,
      qKeys: Object.keys(query), bKeys: Object.keys(body),
      tid: !!transactionId, orderNo: !!orderNumber, amt: !!amount,
      allBodyKeys: Object.keys(body),
    });
    return fail('결제가 완료되지 않았어요. 결제창에서 취소하셨거나 오류가 발생했어요.');
  }

  // 서버 사이드 금액 검증: Firestore에서 설정값 로드 후 클라이언트 전달 금액과 대조
  if (configId) {
    try {
      const fbProject = 'beyhome-admin';
      const fbApiKey  = process.env.FIREBASE_API_KEY || 'AIzaSyC8uy09XOeEYIs1m3Rga5BMqd7gS7o3roI';
      const cfgUrl    = `https://firestore.googleapis.com/v1/projects/${fbProject}/databases/(default)/documents/cms_payment_configs/${encodeURIComponent(configId)}?key=${encodeURIComponent(fbApiKey)}`;
      const cfgRes    = await fetch(cfgUrl, { signal: AbortSignal.timeout(5000) });
      if (cfgRes.ok) {
        const cfgDoc = await cfgRes.json();
        const f      = cfgDoc.fields || {};
        const fsNum  = (fld) => parseInt(fld?.integerValue ?? fld?.doubleValue ?? '0') || 0;
        const fsStr  = (fld) => fld?.stringValue || '';

        const baseAmount = fsNum(f.amount);
        const options    = f.options?.arrayValue?.values || [];

        let unitPrice = baseAmount;
        if (optionLabel && options.length > 0) {
          const matched = options.find(o => fsStr(o.mapValue?.fields?.label) === optionLabel);
          if (matched) {
            const optPrice = fsNum(matched.mapValue?.fields?.price);
            if (optPrice > 0) unitPrice = optPrice;
          }
        }

        if (unitPrice > 0) {
          const expectedAmount  = unitPrice * qty;
          const requestedAmount = parseInt(amount) || 0;
          if (requestedAmount !== expectedAmount) {
            console.error('[confirm-payup] amount mismatch', { configId, expected: expectedAmount, requested: requestedAmount, optionLabel, qty });
            return fail('결제 금액이 올바르지 않아요. 처음부터 다시 시도해 주세요.');
          }
        }
      }
    } catch (cfgErr) {
      // 설정 조회 실패 시 차단하지 않고 계속 진행 (결제 플로우 보호)
      console.warn('[confirm-payup] config validation skipped:', cfgErr.message);
    }
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
      return _htmlRedirect(`/tools/payment/?${params.toString()}`);
    }

    return fail(payData.data?.responseMsg || payData.message || '결제 승인 실패');
  } catch (e) {
    return fail(e.message || '서버 오류가 발생했어요.');
  }
}
