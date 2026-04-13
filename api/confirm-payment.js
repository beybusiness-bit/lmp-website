export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentKey, orderId, amount } = req.body;
  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ success: false, error: '필수 파라미터 누락' });
  }

  const secretKey = process.env.TOSS_SECRET_KEY;
  const encoded = Buffer.from(secretKey + ':').toString('base64');

  try {
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });

    const data = await tossRes.json();

    if (!tossRes.ok) {
      return res.status(tossRes.status).json({ success: false, error: data.message });
    }

    // TODO: Phase 5 — GAS 웹훅으로 participation_logs 시트 기록
    // await fetch(process.env.GAS_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     action: 'createLog',
    //     orderId: data.orderId,
    //     orderName: data.orderName,
    //     amount: data.totalAmount,
    //     paymentKey: data.paymentKey,
    //     paymentMethod: data.method,
    //     payment_status: '확인',
    //     payment_confirmed_at: data.approvedAt,
    //   }),
    // });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('결제 승인 오류:', err);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}
