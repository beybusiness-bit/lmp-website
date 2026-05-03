## 플리마켓 셀러·방문객 포털 — CLAUDE.md

### 앱 기본 정보

```javascript
const AUTH = {
  ADMIN_PASSWORD: 'beybey12!',
  SELLER_LOGIN: 'phone', // 전화번호만으로 구글시트 명단 대조
  SHEETS_API_KEY: 'TBD', // Google Cloud Console → 사용자 인증 정보 → API 키
  SHEET_ID: '1e6nyZ4fv-QPPX1SZqgakM4eJmBO1Rp-sdfkUtJFgwK8',
  // Firebase 미사용. 구글 Sheets API (공개 시트 + API 키) 방식으로 대체.
};
const REPO = {
  GITHUB_URL: 'https://github.com/beybusiness-bit/lmp-website',
  LOCAL_PATH: '~/projects/lmp-website',
  DEPLOY_PATH: 'gmbf/index.html', // 기존 사이트에 이 경로로 추가
  DEPLOY_METHOD: 'GitHub Pages', // ⚠️ Vercel 아님. GitHub Pages로 배포
  LIVE_URL: 'https://lazymaxpotential.kr/gmbf/',
  NOTE: '.nojekyll 파일 필수 (없으면 404 발생)',
};
```

### 앱 아키텍처 요약
- **앱 성격**: 플리마켓 셀러 준비 포털 + 방문객 행사 안내 — 단일 HTML 파일(`gmbf/index.html`)로 기존 사이트에 추가
- **배포 방식**: ⚠️ GitHub Pages (Vercel 아님). push → main 브랜치 → 자동 배포. `.nojekyll` 파일 루트에 필수.
- **UI 구조**: 하단 탭 (모바일 최적화), 영역별 페이지 전환
- **로그인**: 공개 영역(누구나) + 셀러 영역(이름+연락처) + 관리자 영역(비밀번호)
- **반응형 전략**: 모바일 우선 개발. 데스크탑에서 열어도 스마트폰 화면처럼 세로형으로 표시 (폰 프레임 레이아웃). 모든 기능 완성 후 여유 생기면 데스크탑 반응형 추가.

#### 📱 폰 프레임 레이아웃 구현 방식
데스크탑에서 접속 시 중앙에 모바일 너비로 고정된 컨테이너 표시:
```css
/* 전체 배경 */
body {
  background: #f0f0f0;
  display: flex;
  justify-content: center;
  min-height: 100vh;
}
/* 모바일 컨테이너 */
#app {
  width: 100%;
  max-width: 430px;   /* iPhone 14 Pro 기준 */
  min-height: 100vh;
  background: #fff;
  position: relative;
  overflow-x: hidden;
}
/* 실제 모바일 기기에서는 전체 화면 */
@media (max-width: 430px) {
  body { background: #fff; }
}
```
모든 UI 컴포넌트는 이 `#app` 컨테이너 안에서만 동작하도록 구현한다.
- **사용자 역할**: 3가지 — 방문객(비로그인), 셀러(이름+연락처 인증), 관리자(비밀번호)
- **외부 연동**: Tally(부스정보 제출·방문신청 임베드 → 구글시트 자동 연동), HTML Canvas(마케팅 이미지 합성)
- **PWA**: 미적용
- **FCM 알림**: 미적용
- **기존 도구 마이그레이션**: 없음 (처음 만드는 앱)

---

### ⚠️ 비전문가 사용자 안내 원칙

이 앱의 주 사용자는 개발·코딩 배경이 없는 비전문가다. Claude Code는 아래 원칙을 항상 지킨다:

1. **모든 작업에 자세한 설명 동반**: 코드를 수정했으면 "무엇을 왜 바꿨는지"를 평이한 말로 함께 설명한다. 전문 용어는 괄호 안에 간단한 풀이를 덧붙인다.
2. **단계별 안내**: 사용자가 직접 해야 할 일(파일 복사, 설정 입력 등)은 번호를 매긴 단계로 안내한다.
3. **오류 발생 시**: 에러 메시지를 그대로 던지지 말고 "무슨 문제인지, 어떻게 해결하면 되는지"를 풀어서 설명한다.
4. **확인 요청**: 사용자가 직접 조작해야 하는 단계가 있으면, 완료 여부를 확인 후 다음으로 넘어간다.

---

### 🔁 세션 과부하 감지 및 전환 권유

아래 상황 중 하나라도 해당되면 사용자에게 **세션 변경을 먼저 권유**한다:

- 현재 세션에서 주고받은 메시지가 많아져 맥락을 정확히 추적하기 어려울 때
- 같은 오류가 3회 이상 반복되어 해결이 안 될 때
- 여러 기능을 동시에 수정하다가 흐름이 얽혔을 때

---

### 세션 운영 원칙

- **기본 단위**: 개발 단계 하나 = Claude Code 세션 하나
- **세션 전환 기준**: 코드 300줄 초과로 수정이 복잡해질 때 / 새로운 기능 영역 진입 시
- **CLAUDE.md 갱신**: 매 세션 마무리 시 Claude Code가 이 파일을 직접 수정한다.

---

### 🟢 세션 시작 시 자동 수행

첫 메시지를 받으면 사용자 요청 처리 전에 **자동으로** 아래를 수행한다.

#### Step 1. 실행 환경 판별

```
현재 위치가 /home/user 같은 임시 클라우드 경로인가?
  ├─ 예 (Remote 세션) → Step 1-R
  └─ 아니오 (Local 세션) → Step 1-L
```

#### Step 1-R. Remote 세션 (☁️ 환경)

- **🔑 PAT 확인 (Remote 세션에서는 필수):**
  ```bash
  git remote -v
  ```
  출력된 origin URL에 `ghp_` 또는 `github_pat_`로 시작하는 토큰이 포함되어 있으면 OK.
  없다면 → 아래 "🔑 PAT 설정 프로토콜" 섹션을 먼저 수행한다.

#### Step 1-L. Local 세션 (💻 환경)

```
~/projects/lmp-website 폴더가 존재하는가?
  ├─ 없음 → git clone https://github.com/beybusiness-bit/lmp-website
  └─ 있음 → git pull origin main
```

#### Step 2. 현황 요약 보고

```
📋 현재 상황 요약
- 환경: [Remote ☁️ / Local 💻]
- 완료: [완료된 단계 목록 ✅]
- 진행중: [현재 단계 🔄]
- 남은 것: [예정 단계 목록 🔲]
- 이번 세션 시작점: [다음 할 작업]
```

---

### 📌 세션 시작 방법 (사용자 참고용)

**방법 A. Claude 데스크톱 앱 Code 탭 — Remote(☁️) 환경 (권장)** ⭐
1. 앱 좌측 사이드바에서 Code 탭 열기
2. `+ 새 세션` 클릭 → 환경: **Remote(☁️)** 선택
3. `https://github.com/beybusiness-bit/lmp-website` 저장소 선택
4. 작업 내용 입력하고 시작

**방법 B. 터미널**
```bash
cd ~/projects/lmp-website
claude
```

---

### 🔴 세션 종료 시 자동 수행

사용자가 "끝났어" / "마무리할게" 등을 말하면:

1. `git status` — 변경된 파일 목록 확인
2. 변경 목록 + 제안 커밋 메시지를 사용자에게 보여주고 승인 받기
3. 승인 후 `git add [변경 파일 명시] && git commit && git push origin main`
   - ⚠️ `git add .` / `git add -A` 금지
4. push 성공 확인
5. CLAUDE.md 직접 갱신 (완료 단계 ✅, 다음 시작점 업데이트)
6. CLAUDE.md 갱신분도 함께 커밋·push
7. PAT 설정된 경우 현재 PAT 출력
8. 다음 세션 시작 프롬프트 출력

---

### 🔑 PAT(Personal Access Token) 설정 프로토콜

**실패 시점(push 403) 또는 세션 시작 시(Step 1-R)에 PAT이 없으면:**

1. 사용자에게 토큰 요청:
   > "GitHub → Settings → Developer settings → Personal access tokens (classic)
   > → Generate new token → Scope: `repo` 하나만 체크 → `ghp_…` 토큰 붙여넣어 주세요."

2. 토큰 받으면:
   ```bash
   git remote set-url origin https://ghp_TOKEN@github.com/beybusiness-bit/lmp-website.git
   git push -u origin main
   ```

---

### 🔵 수정 후 자동 배포

수정 요청 → 코드 수정 → 문법 검증 → commit + push → 안내:
```
✅ 푸시 완료. GitHub Pages 반영까지 ~1분 소요.
브라우저에서 Ctrl+Shift+R (Mac: Cmd+Shift+R) 하드 리프레시 해주세요.
접속 URL: [커스텀 도메인]/flea-market/
```

---

### Phase 2: 개발 진행 프로토콜

#### 파일 구조
```
lmp-website/
└── flea-market/
    ├── index.html        ← 메인 단일 파일 (모든 기능 포함)
    ├── assets/
    │   ├── template.png  ← 마케팅 이미지 템플릿 (사용자가 제공)
    │   └── map.png       ← 현장 배치도 이미지 (사용자가 제공)
    └── README.md
```

#### 코드 작업 원칙

```javascript
// ① today() — 반드시 로컬 날짜 기준
const today = () => {
  const d = new Date();
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
};
// ② AUTH 상수 — 매 작업마다 위 실제값 유지
// ③ Firestore 설정값은 사용자가 Firebase 새 프로젝트 만들고 나서 채움 (현재 TBD)
```

**절대 금지:** script 안 백틱 중첩 / `innerHTML` null 체크 생략 / `toISOString()` UTC 날짜

**수정 방식:** 300줄 미만 전체 재작성 / 이상은 부분 수정

#### Firestore 컬렉션 구조

```
sellers/
  {sellerId}/
    name: string          // 셀러 이름
    phone: string         // 연락처 (로그인 키)
    boothNumber: string   // 부스 번호
    boothName: string     // 부스명 (방문객 소개 페이지에 표시)
    description: string   // 부스 소개 (방문객 소개 페이지에 표시)
    category: string      // 판매 카테고리
    isPublic: boolean     // 방문객 소개 페이지 노출 여부
    tallySubmitted: boolean // 부스정보 Tally 제출 여부
    createdAt: timestamp

checklists/
  {sellerId}/
    items: array          // [{id, text, checked, checkedAt}]
    updatedAt: timestamp

settings/
  event/
    eventDate: string     // 행사 날짜 (D-Day 계산용)
    expectedVisitors: number // 예상 방문객 수 (셀러·관리자만 표시)
    mapImageUrl: string   // 배치도 이미지 URL
    announcementText: string // 홈 공지 텍스트
```

#### 3가지 사용자 영역 분리 방식
- **공개 영역**: 기본 표시 (로그인 불필요)
- **셀러 영역**: `sessionStorage`에 `sellerSession: {id, name}` 저장으로 상태 유지
- **관리자 영역**: `sessionStorage`에 `adminSession: true` 저장
- Firebase Auth 사용하지 않음

#### Tally 임베드 방식
```html
<!-- 부스 정보 제출 폼 (셀러용) -->
<iframe src="https://tally.so/embed/[TALLY_FORM_ID]" width="100%" height="500"></iframe>

<!-- 방문 신청 폼 (공개용) -->
<iframe src="https://tally.so/embed/[VISIT_FORM_ID]" width="100%" height="500"></iframe>
```
Tally 폼 ID는 사용자가 Tally에서 폼 만든 후 제공. 현재 TBD.

#### HTML Canvas 마케팅 이미지 합성 방식
- 배경: `assets/template.png` (사용자가 준비한 템플릿)
- 합성 요소: 셀러가 업로드한 상품 사진 + 텍스트 (부스명, 슬로건 등)
- 좌표: 템플릿 받은 후 사용자와 함께 위치 지정
- 출력: PNG 풀화질 다운로드

#### 현장 배치도 클릭 기능
- 배치도 이미지 위에 투명한 `<div>` 영역을 좌표로 지정
- 클릭 시 해당 위치의 안내 팝업 표시
- 위치 좌표와 안내 내용은 코드 내 배열로 관리 (수정 시 코드 직접 편집)

---

### Phase 3: 배포 프로토콜

1. `flea-market/index.html` GitHub 저장소에 push
2. 커스텀 도메인에 연결된 기존 사이트에 `/flea-market/` 경로로 자동 접속
3. Firebase 콘솔 → 새 프로젝트 생성 → Firestore 활성화 → firebaseConfig 값 코드에 입력
4. Firestore 보안 규칙:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true; // 초기 개발용. 운영 전 강화 필요
       }
     }
   }
   ```
5. Firebase 새 프로젝트 생성 가이드: Firebase 콘솔(console.firebase.google.com) → 프로젝트 추가 → 웹 앱 추가 → firebaseConfig 복사

---

### 개발 단계 현황

**🎯 목표 1: 셀러 기능 배포 (1~2일)**

1단계: 기반 구조 + 셀러 로그인 — ✅ 완료
  - gmbf/po-c/index.html 단일 파일 구조 (셀러 랜딩 + 진행화면 통합)
  - 셀러 로그인: 휴대전화번호 입력 → Google Apps Script → 구글시트 명단 대조
  - 관리자 로그인: 비밀번호(`beybey12!`)
  - 모바일 최적화 레이아웃, 배경 슬라이드쇼 (bg1~bg5.jpeg), 컬러 사이클링
  - 로고(logo.png) + 장바구니(basket.png) CSS mask 기법으로 컬러 동적 변경
  - 전역 디자인 시스템: .btn .box .inp (검정 테두리, 투명 배경)
  - 셀러 인증 후 진행화면(#prep-screen) 아래에서 슬라이드업
  - 5단계 스테이지 카드 + 좌측 사이드 메뉴
  - 상단 topbar: 장바구니 아이콘 fill 애니메이션(clip-path) + 완료%

  ⚠️ 미완 항목:
  - Google Apps Script URL: 사용자가 배포 후 APPS_SCRIPT_URL 상수에 삽입 필요
  - 구글시트 "sellers" 탭 헤더(대표자명/휴대전화번호) + 첫 셀러(백은영/01063205653) 추가 필요
  - Google Apps Script에 action=log 핸들러 추가 필요 (이벤트 로깅)

2단계: 셀러 핵심 기능 — 🔲 진행 예정
  - 5개 스테이지 상세 페이지 (각 스테이지 클릭 시 내용 표시)
  - 체크리스트: 항목 체크 & 구글시트 저장
  - 내 부스: 배치도 이미지에서 내 위치 표시, Tally 부스정보 제출 임베드

3단계: 마케팅 이미지 — 🔲 진행 예정
  - HTML Canvas로 템플릿+사진+텍스트 합성
  - PNG 다운로드

4단계: 관리자 대시보드 (셀러 관련) — 🔲 진행 예정
  - 셀러 명단 등록·삭제 (구글시트 연동)
  - 체크리스트 제출 현황
  - 배치도 이미지 교체
  - 예상 방문객 수·공지 수정

**→ 여기서 배포, 셀러들 사용 시작**

**🎯 목표 2: 전체 완성 (추가 1일)**

5단계: 공개 페이지 (방문객용) — 🔲 진행 예정
  - 홈: 행사 정보, D-Day 카운트다운 (예상 방문객 수는 셀러·관리자만 표시)
  - 플리마켓 소개
  - 오시는 길
  - 방문 신청: Tally 임베드

6단계: 방문객용 콘텐츠 — 🔲 진행 예정
  - 셀러 소개 페이지: 구글시트에서 부스정보 자동 반영, 카드 형태
  - 현장 안내: 배치도 이미지 클릭 → 위치별 안내 팝업
  - 체험·미션 안내: 이미지+텍스트 (코드로 수정)

---

### DB 구조 (Google Sheets — Firebase 미사용)

**연동 방식: Google Sheets API (공개 시트 + API 키)**
- Apps Script 불필요. HTML에서 Sheets API 직접 호출.
- 시트 공개 설정: "링크가 있는 모든 사용자 → 뷰어"
- API 엔드포인트: `https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{RANGE}?key={API_KEY}`

구글시트 ID: `1e6nyZ4fv-QPPX1SZqgakM4eJmBO1Rp-sdfkUtJFgwK8`

탭 구조:
- `sellers`: 대표자명(A) | 휴대전화번호(B) | 부스번호(C) | 부스명(D) | 소개(E) | 카테고리(F) | 공개여부(G)
- `checklist_log`: 이벤트 로그 형태 (타임스탬프 | 셀러전화번호 | 액션 | 데이터)
- `event_log`: 전체 사용자 행동 로그 (타임스탬프 | 셀러전화번호 | 이벤트 | 추가데이터)

⚠️ 쓰기(로그 기록) 기능은 현재 미구현. 읽기(셀러 인증)만 API 키로 처리.

---

### 개발 기획 내용 누적

**⚠️ 이 섹션은 절대 삭제·축약하지 않는다.**

**확정된 기획 (Phase 1 완료)**

앱 성격
- 플리마켓 셀러 준비 포털 + 방문객 행사 안내 통합 웹앱
- 기존 홈페이지(beybusiness-bit/lmp-website) 의 `/flea-market/` 경로에 단일 HTML 파일로 추가
- Firebase Auth 사용 안 함. Firestore만 사용.

사용자 구분
- 방문객: 로그인 없이 공개 페이지 열람
- 셀러: 이름+연락처 입력 → Firestore 명단 대조 후 입장. 셀러별 개인 데이터(체크리스트, 부스정보) 관리
- 관리자: 고정 비밀번호(`beybey12!`) 입력 후 입장

셀러 기능
- 안내 가이드: 사전에 준비된 가이드를 상황별 트리 분기로 맞춤 제공 (AI 없음)
- 체크리스트: 준비 항목 체크 & Firestore 저장
- 내 부스: 배치도에서 내 위치 확인, Tally로 부스 정보 제출
- 마케팅 이미지: HTML Canvas로 준비된 템플릿에 사진+텍스트 합성 후 PNG 다운로드
- (제거) AI 코치, 셀러 문의 시스템

관리자 기능
- 셀러 명단 등록·삭제 (→ 방문객용 셀러 소개 페이지 자동 반영)
- 체크리스트 제출 현황 확인
- 배치도 이미지 교체
- 예상 방문객 수 공지 (셀러·관리자에게만 표시)
- 안내문 수정 (코드로 직접 텍스트 수정)
- 부스정보 제출 데이터 → Tally-구글시트 자동 연동으로 확인 (관리자 UI 불필요)

방문객 기능 (2차)
- 홈: 행사 정보, D-Day (예상 방문객 수는 셀러·관리자만)
- 셀러 소개: 셀러가 제출한 부스정보 Firestore에서 자동 반영
- 현장 안내: 배치도 이미지 클릭 → 위치별 안내 팝업
- 체험·미션 안내: 이미지+텍스트 (코드 수정으로 관리)
- 방문 신청: Tally 임베드 (SMS 연동은 운영자가 별도 처리)
- 오시는 길

외부 연동
- Tally: 부스정보 제출 + 방문 신청 폼 임베드. 구글시트 자동 연동 (Tally 설정에서 처리)
- HTML Canvas: 마케팅 이미지 합성
- Canva API: 추후 검토 (현재 미적용)

미결 항목 (개발 시작 전 사용자가 준비해야 할 것)
- ~~Firebase 새 프로젝트 생성~~ → Google Sheets API 방식으로 대체
- Google Cloud Console에서 Sheets API 키 발급 후 전달 (AIzaSy... 형태)
- 구글시트 공개 설정 ("링크 있는 사람 뷰어") 완료
- 구글시트 sellers 탭 설정 (헤더 + 첫 셀러 입력)
- Tally 부스정보 제출 폼 생성 후 폼 ID 전달
- Tally 방문 신청 폼 생성 후 폼 ID 전달
- 마케팅 이미지 템플릿 파일 (PNG/JPG) 전달
- 현장 배치도 이미지 파일 전달
- 클릭형 배치도에서 각 위치의 안내 내용 정리해서 전달

---

### 가이드 문서 참고 내용 누적

(개발 진행 후 세션마다 추가)

---

### 다음 세션 시작점

2단계 — 셀러 핵심 기능 (스테이지 상세 페이지)부터 시작

세션 시작 시 먼저 확인할 것:
1. Google Sheets API 키 받기 (AIzaSy... 형태) → `gmbf/po-c/index.html`의 `SHEETS_API_KEY` 상수에 삽입
2. 구글시트 공개 설정 + sellers 탭 설정 완료 여부
3. 스테이지 2~5 각각의 상세 내용 사용자에게 확인

**현재 파일 구조:**
```
lmp-website/
├── gmbf/
│   ├── po-c/
│   │   └── index.html    ← 셀러 메인 (랜딩 + 진행화면 통합) ← 1단계 완성
│   ├── visitor/
│   │   └── index.html    ← 방문객 페이지 (플레이스홀더만 있음)
│   ├── assets/
│   │   ├── logo.png      ← 투명 PNG 로고
│   │   ├── basket.png    ← 투명 PNG 장바구니 아이콘
│   │   ├── bg1~bg5.jpeg  ← 배경 슬라이드쇼 이미지
│   └── index.html        ← 기존 단일 앱 (현재 미사용)
├── .nojekyll             ← GitHub Pages 필수
└── CLAUDE.md
```

**Google Apps Script 코드 (사용자가 배포해야 함):**
```javascript
const SHEET_ID = '1e6nyZ4fv-QPPX1SZqgakM4eJmBO1Rp-sdfkUtJFgwK8';
function doGet(e) {
  const action = e.parameter.action || '';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (action === 'auth') {
    const phone = (e.parameter.phone || '').replace(/\D/g, '');
    const sheet = ss.getSheetByName('sellers');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).replace(/\D/g, '') === phone)
        return ContentService.createTextOutput(JSON.stringify({ success: true, seller: { name: rows[i][0], phone: rows[i][1] } })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
  }
}
```
배포 방법: Apps Script → 배포 → 새 배포 → 유형: 웹앱 → 액세스: 모든 사용자 → 배포

---

### ⚠️ 세션 종료 규칙 요약

위 "🔴 세션 종료 시 자동 수행" 절차를 따른다. 사용자가 명시적으로 종료 의사를 밝혀야 CLAUDE.md를 갱신한다.
