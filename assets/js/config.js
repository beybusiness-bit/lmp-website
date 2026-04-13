/**
 * lmp작업실 사이트 설정 파일
 * ─────────────────────────────────────────
 * 이 파일은 어드민 웹앱에서 자동으로 수정됩니다.
 * 직접 수정할 경우 어드민 설정과 충돌할 수 있으니 주의하세요.
 */

const SITE_CONFIG = {

  // ── 기본 정보 ──────────────────────────────
  siteName: "lmp작업실",
  siteUrl: "https://lazymaxpotential.kr",
  siteDescription: "느리지만 분명히 뭔가를 저지르는 곳",

  // ── 로고 설정 ──────────────────────────────
  logo: {
    type: "text",            // "text" | "image"
    text: "lmp작업실",
    fontFamily: "'Pretendard', sans-serif",
    fontSize: "1.5rem",
    fontWeight: "800",
    color: "#2A2A2A",
    imageSrc: "",            // type이 "image"일 때 사용
    imageAlt: "lmp작업실 로고",
    imageHeight: "40px",
  },

  // ── 컬러 테마 ──────────────────────────────
  colors: {
    bgIvory:     "#FFF9F3",
    bgPink:      "#FFF0F8",
    accentGreen: "#BAFF47",
    accentPink:  "#FF6B9D",
    text:        "#2A2A2A",
    textMuted:   "#888888",
    footerBg:    "#1E1E1E",
    footerText:  "#CCCCCC",
    border:      "#E8E0D8",
    white:       "#FFFFFF",
  },

  // ── 타이포그래피 ────────────────────────────
  typography: {
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSizeBase: "16px",
  },

  // ── 내비게이션 ──────────────────────────────
  nav: [
    {
      label: "게으르지만",
      sub: "lmp를 소개해요",
      path: "/lazy",
      items: [
        { label: "lmp작업실 소개",    path: "/lazy/info",         status: "active" },
        { label: "찾아오는 길",        path: "/lazy/way-to-come",  status: "active" },
        { label: "작업실의 사람들",    path: "/lazy/lmpeople",     status: "active" },
      ]
    },
    {
      label: "뭔가",
      sub: "공간과 커뮤니티",
      path: "/max",
      items: [
        { label: "작업실 입주",              path: "/max/monthly-tenency", status: "active" },
        { label: "공간대여",                 path: "/max/rental",          status: "active" },
        { label: "저스트모닝기지개클럽",     path: "/max/jmgc",            status: "active" },
        { label: "안 한 거 전시회",          path: "/max/undone-gallery",  status: "active" },
        { label: "작업실 투어 신청",         path: "/max/tour",            status: "hidden" },
      ]
    },
    {
      label: "저지를 인간",
      sub: "행사, 상점, 콘텐츠",
      path: "/potential",
      items: [
        { label: "작업실에서 벌어진 일들",          path: "/potential/events",      status: "active" },
        { label: "게을러서 못 열 뻔한 플리마켓",    path: "/potential/gmbf",        status: "active" },
        { label: "상점",                             path: "/potential/shop",        status: "active" },
        { label: "작업실과 협업하려면?",             path: "/potential/workwithus",  status: "active" },
        { label: "게을러서 못 열 뻔한 상점",         path: "/potential/gmbs",        status: "hidden" },
      ]
    }
  ],

  // ── 페이지 메타 정보 ────────────────────────
  pages: {
    "/":                          { title: "홈",                          category: "",          status: "active" },
    "/lazy/info":                 { title: "lmp작업실 소개",              category: "게으르지만", status: "active" },
    "/lazy/way-to-come":          { title: "찾아오는 길",                 category: "게으르지만", status: "active" },
    "/lazy/lmpeople":             { title: "작업실의 사람들",             category: "게으르지만", status: "active" },
    "/max/monthly-tenency":       { title: "작업실 입주",                 category: "뭔가",       status: "active" },
    "/max/rental":                { title: "공간대여",                    category: "뭔가",       status: "active" },
    "/max/jmgc":                  { title: "저스트모닝기지개클럽",        category: "뭔가",       status: "active" },
    "/max/undone-gallery":        { title: "안 한 거 전시회",             category: "뭔가",       status: "active" },
    "/max/tour":                  { title: "작업실 투어 신청",            category: "뭔가",       status: "hidden" },
    "/potential/events":          { title: "작업실에서 벌어진 일들",      category: "저지를 인간", status: "active" },
    "/potential/gmbf":            { title: "게을러서 못 열 뻔한 플리마켓", category: "저지를 인간", status: "active" },
    "/potential/shop":            { title: "상점",                        category: "저지를 인간", status: "active" },
    "/potential/workwithus":      { title: "작업실과 협업하려면?",        category: "저지를 인간", status: "active" },
    "/potential/gmbs":            { title: "게을러서 못 열 뻔한 상점",    category: "저지를 인간", status: "hidden" },
  },

  // ── 푸터 ────────────────────────────────────
  footer: {
    slogan: "느리지만 분명히 뭔가를 저지르는 곳",
    social: {
      instagram: "https://www.instagram.com/lmp.studio",  // 실제 주소로 교체해주세요
      kakao:     "http://pf.kakao.com/_xijvcG/chat",
    },
    links: {
      terms:   "/terms.html",
      privacy: "/privacy.html",
    },
    legal: {
      company:          "",          // 상호 및 대표자 성명 — 어드민에서 입력
      representative:   "",          // 대표자
      address:          "서울시 중구 을지로 282-5",
      phone:            "070-8027-1975",
      email:            "team@lazymaxpotential.kr",
      businessNumber:   "",          // 사업자등록번호 — 어드민에서 입력
      mailOrderNumber:  "",          // 통신판매업신고번호 — 어드민에서 입력
      mailOrderUrl:     "https://www.ftc.go.kr/bizCommPop.do",  // 사업자정보확인 링크
      privacyOfficer:   "",          // 개인정보관리책임자 — 어드민에서 입력
      hostingProvider:  "Vercel Inc.",
    },
  },

  // ── 카카오 채널 ─────────────────────────────
  kakaoChannel: {
    url: "http://pf.kakao.com/_xijvcG/chat",
    show: true,
  },

};
