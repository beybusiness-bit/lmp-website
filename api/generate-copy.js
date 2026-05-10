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
    format:      { label: '형식',   choices: {
      bullet:      '개조식 (항목별 나열)',
      prose:       '문장식 (자연스러운 문단)',
      noun_ending: '명사형 종결 (~소개, ~운영 예정 등)',
      slogan:      '슬로건형 (짧고 강렬한 한 줄)',
      question:    '질문형 (궁금증 유발)',
      storytelling:'스토리텔링형 (서사 흐름)',
    }},
    register:    { label: '말투',   choices: {
      spoken:  '구어체 (말하듯 자연스럽게)',
      written: '문어체 (정제된 글투)',
      sns:     '소셜미디어체 (해시태그·이모지 허용)',
      letter:  '편지체 (독자에게 직접 말 걸기)',
      inner:   '독백형 (내면의 목소리)',
    }},
    formality:   { label: '격식',   choices: {
      intimate:     '친밀한 (친구처럼)',
      casual:       '편안한 톤',
      neutral:      '중립적인',
      formal:       '격식체',
      authoritative:'권위 있는',
    }},
    mood:        { label: '분위기·감성', choices: {
      warm:        '따뜻한',
      friendly:    '친근한',
      playful:     '유쾌한',
      exciting:    '설레는',
      touching:    '감동적인',
      lyrical:     '감성적인',
      mysterious:  '신비로운',
      calm:        '차분한',
      serious:     '진지한',
      professional:'전문적인',
      trustworthy: '신뢰감 있는',
      solemn:      '장엄한',
      intense:     '강렬한',
      urgent:      '긴박한',
      cold:        '냉정한',
      rigid:       '딱딱한',
      // custom 값은 사용자가 직접 입력한 텍스트로 대체되어 전달됨
    }},
    speech_level:{ label: '어미',   choices: {
      honorific: '경어 (합니다체)',
      plain:     '평어 (한다체)',
    }},
  };

  const styleLines = Object.entries(styleSelections || {})
    .map(([k, v]) => {
      if (!styleNames[k]) return null;
      const dim = styleNames[k];
      // v may be a comma-joined multi-select string
      const label = v.split(',').map(p => dim.choices[p.trim()] || p.trim()).filter(Boolean).join(', ');
      return `- ${dim.label}: ${label}`;
    })
    .filter(Boolean).join('\n');

  const charLimit = [
    minChars ? `최소 ${minChars}자` : '',
    maxChars ? `최대 ${maxChars}자` : '',
  ].filter(Boolean).join(', ');

  const fullPrompt = [
    '당신은 행사·프로젝트용 카피라이터입니다.',
    '사용자의 입력을 바탕으로 자연스럽고 매력적인 한국어 문구를 작성하세요.',
    styleLines ? `\n스타일 조건:\n${styleLines}` : '',
    charLimit ? `\n글자 수 조건: ${charLimit}` : '',
    '\n반드시 JSON 배열 형식으로만 응답하세요. 예: ["문구1", "문구2", "문구3"]',
    '설명, 머리말, JSON 외 텍스트는 절대 포함하지 마세요.',
    '\n---',
    `\n입력 내용:\n${Object.entries(fields || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}`,
    (references || []).length ? '\n참고 문구 예시:\n' + references.map(r => `- ${r}`).join('\n') : '',
    (existingPhrases || []).length ? '\n이미 생성된 문구(중복 금지):\n' + existingPhrases.map(p => `- ${p}`).join('\n') : '',
    `\n\n위 내용을 참고해 ${count}개의 문구를 JSON 배열로 작성하세요.`,
  ].filter(Boolean).join('\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(500).json({ error: errData.error?.message || 'Gemini API 오류' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // 마크다운 코드펜스 제거 후 JSON 파싱
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    let phrases;
    try {
      phrases = JSON.parse(cleaned);
      if (!Array.isArray(phrases) && Array.isArray(phrases?.phrases)) phrases = phrases.phrases;
      if (!Array.isArray(phrases)) throw new Error('배열 아님');
    } catch {
      phrases = cleaned.split('\n').map(l => l.replace(/^[-•\d.)]\s*["']?/, '').replace(/["']$/, '').trim()).filter(Boolean);
    }

    return res.status(200).json({ phrases });
  } catch (err) {
    console.error('[generate-copy]', err);
    return res.status(500).json({ error: '서버 오류: ' + err.message });
  }
}
