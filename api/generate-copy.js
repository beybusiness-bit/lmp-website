export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fields, styleSelections, references, outputConfig, existingPhrases, referenceRole, aiContext, speakerDesc } = req.body || {};

  const count = Math.min(Math.max(outputConfig?.count || 5, 1), 10);
  const minChars = outputConfig?.minChars || 0;
  const maxChars = outputConfig?.maxChars || 0;
  const maxTokens = Math.min(8192, Math.max(1024, count * Math.max(maxChars || 150, 150) * 3));

  const styleNames = {
    purpose:     { label: '용도',     choices: {
      instagram:    '인스타그램 게시물',
      poster:       '포스터·배너 헤드라인',
      email_subject:'이메일 제목줄',
      web_headline: '웹사이트 헤드라인',
      event_notice: '행사·이벤트 안내문',
      press_release:'보도자료·공식 문서',
      youtube:      '유튜브 제목·썸네일',
      outdoor:      '현수막·옥외광고',
      product:      '제품·서비스 소개',
    }},
    target:      { label: '타겟 독자', choices: {
      teens:        '10대',
      young_adult:  '20-30대',
      office_worker:'직장인',
      parent:       '부모·학부모',
      entrepreneur: '소상공인·창업자',
      middle_age:   '40-50대 중장년',
      senior:       '시니어·60대 이상',
      professional: '전문직',
      general:      '일반 대중',
    }},
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
    }},
    speech_level:{ label: '어미',   choices: {
      formal_polite:  '합니다체 (격식 경어)',
      informal_polite:'해요체 (편한 경어)',
      mixed_polite:   '합니다체와 해요체를 자연스럽게 혼합',
      formal_plain:   '한다체 (격식 평어)',
      casual_plain:   '해체 (~했어, ~할게 등 친구에게 말하듯)',
      mixed_plain:    '한다체와 해체를 자연스럽게 혼합',
    }},
  };

  const styleLines = Object.entries(styleSelections || {})
    .map(([k, v]) => {
      if (!styleNames[k]) return null;
      const dim = styleNames[k];
      const label = v.split(',').map(p => dim.choices[p.trim()] || p.trim()).filter(Boolean).join(', ');
      return `- ${dim.label}: ${label}`;
    })
    .filter(Boolean).join('\n');

  const charLimit = [
    minChars ? `최소 ${minChars}자` : '',
    maxChars ? `최대 ${maxChars}자` : '',
  ].filter(Boolean).join(', ');

  const refInstruction = (references || []).length
    ? (referenceRole === 'similar'
        ? '참고 문구와 유사한 구조·표현 방식으로 작성하세요 (내용은 입력 내용 기준):\n' + references.map(r => `- ${r}`).join('\n')
        : '아래 문구들의 분위기와 톤만 참고하고, 내용은 입력 내용 기준으로 새로 작성하세요:\n' + references.map(r => `- ${r}`).join('\n'))
    : '';

  const systemPrompt = [
    '당신은 한국어 카피라이터입니다.',
    '사용자의 입력을 바탕으로 자연스럽고 매력적인 한국어 문구를 작성하세요.',
    speakerDesc ? `\n화자(발신자) 정보: ${speakerDesc}` : '',
    aiContext ? `\n배경 및 컨텍스트:\n${aiContext}` : '',
    styleLines ? `\n스타일 조건:\n${styleLines}` : '',
    charLimit ? `\n글자 수 조건: ${charLimit}` : '',
    '\n중요 규칙:',
    '- 각 문구는 구조·시작 방식·표현 접근법이 서로 달라야 합니다 (비슷한 변형 금지)',
    '- 한국인에게 자연스럽고 실제로 쓰일 법한 문구를 작성하세요',
    '- 반드시 JSON 배열 형식으로만 응답하세요. 예: ["문구1", "문구2", "문구3"]',
    '- 설명, 머리말, JSON 외 텍스트는 절대 포함하지 마세요.',
  ].filter(Boolean).join('\n');

  const userPrompt = [
    `입력 내용:\n${Object.entries(fields || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}`,
    refInstruction,
    (existingPhrases || []).length ? '이미 생성된 문구(중복 금지):\n' + existingPhrases.map(p => `- ${p}`).join('\n') : '',
    `\n위 내용을 참고해 ${count}개의 문구를 JSON 배열로 작성하세요.`,
  ].filter(Boolean).join('\n\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
  const model = process.env.COPY_GEN_MODEL || 'claude-haiku-4-5-20251001';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
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
