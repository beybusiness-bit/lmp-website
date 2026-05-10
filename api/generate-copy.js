export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fields, styleSelections, references, outputConfig, existingPhrases } = req.body || {};

  const count = Math.min(Math.max(outputConfig?.count || 5, 1), 10);
  const minChars = outputConfig?.minChars || 0;
  const maxChars = outputConfig?.maxChars || 0;

  const styleNames = {
    format:     { label: '형식',   choices: { bullet: '개조식', prose: '문장식' } },
    register:   { label: '말투',   choices: { spoken: '구어체', written: '문어체' } },
    formality:  { label: '격식',   choices: { formal: '격식체', casual: '편안한 톤' } },
    mood:       { label: '분위기', choices: { friendly: '친근한', solemn: '장엄한' } },
    length_feel:{ label: '길이감', choices: { concise: '간결한', rich: '풍성한' } },
    emotion:    { label: '감성',   choices: { warm: '따뜻한', professional: '전문적인' } },
  };

  const styleLines = Object.entries(styleSelections || {})
    .map(([k, v]) => styleNames[k] ? `- ${styleNames[k].label}: ${styleNames[k].choices[v] || v}` : null)
    .filter(Boolean).join('\n');

  const charLimit = [
    minChars ? `최소 ${minChars}자` : '',
    maxChars ? `최대 ${maxChars}자` : '',
  ].filter(Boolean).join(', ');

  const systemPrompt = [
    '당신은 행사·프로젝트용 카피라이터입니다.',
    '사용자의 입력을 바탕으로 자연스럽고 매력적인 한국어 문구를 작성하세요.',
    styleLines ? `\n스타일 조건:\n${styleLines}` : '',
    charLimit ? `\n글자 수 조건: ${charLimit}` : '',
    '\n반드시 JSON 배열 형식으로만 응답하세요. 예: ["문구1", "문구2", "문구3"]',
    '설명, 머리말, JSON 외 텍스트는 절대 포함하지 마세요.',
  ].filter(Boolean).join('\n');

  const fieldLines = Object.entries(fields || {})
    .map(([k, v]) => `${k}: ${v}`).join('\n');

  const refLines = (references || []).length
    ? '\n참고 문구 예시:\n' + references.map(r => `- ${r}`).join('\n')
    : '';

  const avoidLines = (existingPhrases || []).length
    ? '\n이미 생성된 문구(중복 금지):\n' + existingPhrases.map(p => `- ${p}`).join('\n')
    : '';

  const userPrompt = `입력 내용:\n${fieldLines}${refLines}${avoidLines}\n\n위 내용을 참고해 ${count}개의 문구를 JSON 배열로 작성하세요.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(500).json({ error: errData.error?.message || 'Claude API 오류' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';

    // 마크다운 코드펜스 제거 후 JSON 파싱
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    let phrases;
    try {
      phrases = JSON.parse(cleaned);
      // { phrases: [...] } 형태로 올 경우 대응
      if (!Array.isArray(phrases) && Array.isArray(phrases?.phrases)) phrases = phrases.phrases;
      if (!Array.isArray(phrases)) throw new Error('배열 아님');
    } catch {
      // 줄바꿈 기반 폴백 파싱
      phrases = cleaned.split('\n').map(l => l.replace(/^[-•\d.)]\s*["']?/, '').replace(/["']$/, '').trim()).filter(Boolean);
    }

    return res.status(200).json({ phrases });
  } catch (err) {
    console.error('[generate-copy]', err);
    return res.status(500).json({ error: '서버 오류: ' + err.message });
  }
}
