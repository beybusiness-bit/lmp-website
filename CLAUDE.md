## 플리마켓 셀러·방문객 포털 — CLAUDE.md

### 앱 기본 정보

```javascript
const AUTH = {
  ADMIN_PASSWORD: 'beybey12!',
  SELLER_LOGIN: 'phone', // 전화번호만으로 Firestore 명단 대조
  FIREBASE_PROJECT: 'beyhome-admin', // 기존 프로젝트에 gmbf_ 컬렉션 prefix로 공존
};
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC8uy09XOeEYIs1m3Rga5BMqd7gS7o3roI",
  authDomain: "beyhome-admin.firebaseapp.com",
  projectId: "beyhome-admin",
  storageBucket: "beyhome-admin.firebasestorage.app",
  messagingSenderId: "849320781553",
  appId: "1:849320781553:web:9d844044e85995c0aa2b50"
};
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxjQmrW5PFpdq_5P4XkYZvsXxxAwgHaTl1weS1u1eML_R8nKpMXSP6U-IDGDsazUg-duw/exec';
const REPO = {
  GITHUB_URL: 'https://github.com/beybusiness-bit/lmp-website',
  LOCAL_PATH: '~/projects/lmp-website',
  DEPLOY_PATH: 'gmbf/index.html', // 기존 사이트에 이 경로로 추가
  DEPLOY_METHOD: 'Vercel', // push → main → Vercel 자동 배포 (~1분 소요)
  LIVE_URL: 'https://lazymaxpotential.kr/',
};
```

### 앱 아키텍처 요약
- **앱 성격**: 플리마켓 셀러 준비 포털 + 방문객 행사 안내 — 단일 HTML 파일(`gmbf/index.html`)로 기존 사이트에 추가
- **배포 방식**: Vercel. push → main 브랜치 → 자동 배포 (~1분 소요).
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

### 🖼️ 이미지 입력 필드 구현 규칙 (글로벌, 예외 없음)

**admin 패널(`admin/index.html`)의 모든 이미지·아이콘 입력 필드는 반드시 아래 두 가지를 함께 구현한다. 별도 언급이 없어도 항상 적용한다.**

```html
<!-- 올바른 구현 예시 -->
<div class="ed-lbl">필드 이름 <span style="font-weight:400;opacity:.55;">(투명 PNG 권장)</span></div>
<input class="fi" id="필드-id" placeholder="https://... 이미지 URL">
<button class="bg-up-btn" onclick="document.getElementById('필드-file-inp').click()" style="margin-top:4px;">📁 업로드</button>
<div style="font-size:10px;color:rgba(0,0,0,.45);margin-top:4px;">⚠️ 배경이 투명한 PNG만 — 키컬러가 자동 적용됩니다</div>
<input type="file" id="필드-file-inp" accept="image/png" style="display:none;" onchange="uploadSingleImage(event,'필드-id','Firebase Storage 경로',true)">
```

- URL 텍스트 입력 (`<input class="fi">`)
- 직접 업로드 버튼 (`📁 업로드`) + hidden `<input type="file">` → `uploadSingleImage()` 호출
- `uploadSingleImage(event, fieldId, storagePath, checkTransparency)` 함수는 admin에 전역으로 구현되어 있음
- 투명 PNG 아이콘이면 `checkTransparency: true` (키컬러 자동 적용 안내 문구 포함)
- 일반 이미지(배경 이미지, 프로필 등)면 `checkTransparency: false` (안내 문구 생략 가능)
- **이 규칙을 어기면 안 된다. 매 구현 시 자기 점검할 것.**

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

- **⬇️ main 최신화 (PAT 확인 후 반드시 수행):**
  ```bash
  git fetch origin main
  git log HEAD..origin/main --oneline
  ```
  항상 main으로 전환하고 최신화한다:
  ```bash
  git checkout main
  git pull origin main
  ```
  **⚠️ 이 단계 필수. 이후 모든 작업은 main에서 직접 수행한다. feature 브랜치로 이동하지 않는다.**

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

### ⚠️ 브랜치 운영 규칙

**⚠️ Claude Code 세션은 자동으로 feature 브랜치(claude/...)를 생성하지만, 이 프로젝트에서는 main에 직접 작업한다.**

이유: 관리자 패널이 GitHub API로 main에 직접 커밋하기 때문에, feature 브랜치와 머지할 때 충돌이 발생해 기능이 원복되는 문제가 반복됨.

#### 세션 시작 시 main으로 즉시 전환

```bash
# 세션 시작 직후 항상 실행
git checkout main
git pull origin main
# 이후 모든 작업은 main에서 직접 수행
```

#### 커밋·push 방식

```bash
# feature 브랜치 없이 main에서 직접
git add [변경 파일]
git commit -m "설명"
git push -u origin main
```

- 머지 단계 없음 → 충돌 없음
- push 즉시 Vercel이 자동 배포 시작
- feature 브랜치(claude/...)는 무시하고 사용하지 않음

#### ⚠️ 기존 생성 프로젝트 파일 동기화 필수 — 절대 빠뜨리지 말 것

`p/index.html`은 새 프로젝트 배포 시 복사되는 **템플릿**이다.
기존에 이미 생성된 프로젝트 파일들(`block-test-demo/index.html`, `gmbf-poc/index.html` 등)은 **템플릿 수정 시 자동으로 갱신되지 않는다.**

> 🔴 **이 규칙을 어기면 admin 미리보기는 정상으로 보이지만 실제 플레이어에서는 기능이 동작하지 않는 버그가 발생한다. 실제로 이 실수가 반복 발생했다.**

**`p/index.html`을 수정했으면 — 규모·중요도와 무관하게 — 반드시:**
1. `git ls-files | grep index.html` 로 존재하는 프로젝트 파일 목록 확인
2. **동일한 수정을 `block-test-demo/index.html`, `gmbf-poc/index.html`에도 즉시 적용**
3. 세 파일을 같은 커밋에 포함
4. ✅ 동기화 여부를 커밋 전에 반드시 자기 점검할 것

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

수정 요청 → 코드 수정 → commit + push origin main → Vercel 자동 배포 → 안내:
```
✅ 푸시 완료. Vercel 배포까지 ~1분 소요.
브라우저에서 Ctrl+Shift+R (Mac: Cmd+Shift+R) 하드 리프레시 해주세요.
```

---

### 현재 시스템 구조 (실제 코드 기준)

#### 파일 구조
```
lmp-website/
├── admin/index.html       ← 관리자 CMS 패널 (lazymaxpotential.kr/admin/)
├── p/index.html           ← 프로젝트 플레이어 (lazymaxpotential.kr/{project-id}/)
├── apps-script/Code.gs    ← Google Apps Script 코드 (폼 응답 → 시트 저장용)
├── gmbf/po-c/index.html   ← 구 플리마켓 셀러 포털 (별도 운영)
├── gmbf/visitor/          ← 구 방문객 페이지 (미사용)
└── .nojekyll              ← GitHub Pages 필수
```

#### 역할 분리
| 역할 | 설명 |
|------|------|
| **관리자** | `/admin/` — Google 계정 로그인 (ALLOWED 이메일 목록) |
| **프로젝트 사용자** | `/p/{id}/` — 프로젝트별 인증 필드로 로그인 (Firestore 조회) |
| **비인증 접근** | authEnabled: false 프로젝트는 누구나 열람 |

#### Firestore 컬렉션 구조 (현재 실제)
```
cms_projects/{projectId}
  name, layoutType, editionText
  logoType, logoImageUrl, logoText, logoTextSize, logoTextAlign, logoImgW
  ctaIconUrl, ctaText, ctaIconSize  ← ctaIconSize: 24~200px (새로 추가)
  ddayEnabled, ddayDate
  authEnabled, authCollection, authFields, authKeyField, authTitle, authDesc
  greetingText: string  ← 로그인 후 인사 문구 ({{필드키}} 변수 치환 지원)
  bgImages: [{url, overlay, timing}]
  stages: [{id, title, displayType, stageImageUrl, order,
            trackProgress: boolean,    ← 진행률 표시 ON/OFF
            checkableCount: number}]   ← 체크 가능한 블록 수 (비정규화)
  stats: [{id, label, collection, countType, unit, enabled}]
  elementOrder: string[]
  keyColors: string[]
  updatedAt: timestamp

cms_projects/{projectId}/stage_content/{stageId}
  displayType: 'scroll' | 'slide'
  blocks: [{
    id, type ('text'|'image'|'mixed'|'embed'|'form'|'tool'), order,
    textContent, imageUrl, mixedLayout, embedUrl, embedHeight,
    bgColor, marginV, marginH, linkUrl,
    checkable,     ← 사용자 체크 가능 여부 (boolean)
    -- type:'form' 전용 (레거시, 하위 호환 유지) --
    formId, formTitle, formFields[], formConfig{submitBtnText,noResubmit,sheetId,sheetTab}
    -- type:'tool' 전용 (신규) --
    toolType,      ← 'form' | 'booth' | 'guide'
    toolConfig,    ← { formId?, boothId?, guideId? } 선택한 인스턴스 ID
    height,        ← iframe 높이 px (0=자동, min-height:60vh)
  }]

cms_users_{projectId}/{userId}
  (프로젝트별 authFields에 따라 자유 구조)
  stageProgress: {stageId: [blockId, blockId, ...]}  ← 체크된 블록 ID 목록

cms_form_configs/{formId}           ← 글로벌 폼 설정 (프로젝트 무관)
  title: string                     ← 폼 이름 (도구 탭 식별용)
  fields: [{id, label, type ('text'|'textarea'|'number'|'select'|'file'),
            required, options (선택형 전용), order}]
  submitBtnText: string
  submitMsg: string                 ← 제출 완료 메시지 (HTML)
  noResubmit: boolean               ← 중복 제출 방지
  sheetId: string                   ← Google Sheet ID
  sheetTab: string                  ← 시트 탭명
  createdAt, updatedAt: timestamp

cms_form_responses/{formId}/responses/{responseId}
  submittedAt, userId (인증 시), projectId, ...fieldValues
  ← projectId: 도구 블록이 속한 프로젝트 (lmp-context로 전달받음)

game_configs/booth                  ← 꾸미기 도구 구성 (컬렉션명 유지)
  booths: [{id, name, ...}]

game_configs/guide/forms/{formId}   ← 계산기·가이드 폼 설정

cms_admin_settings/github
  pat: string
```

#### Firestore 보안 규칙 (현재 적용된 것 기준)
```
match /cms_form_responses/{document=**} { allow write: if true; allow read: if request.auth != null; }
match /{col}/{doc} { allow read, write: if col.matches('cms_users_.*'); }
```

#### 외부 연동
| 연동 | 용도 |
|------|------|
| **Firebase Firestore** | 모든 데이터 저장 (프로젝트, 사용자, 폼 응답) |
| **Firebase Storage** | 이미지 업로드 |
| **Google Apps Script** | 폼 응답 → Google Sheets 저장 전용 |
| **GitHub API** | 관리자 저장+배포 (p/{id}/index.html 자동 생성) |

#### Apps Script 정보
```
URL: https://script.google.com/macros/s/AKfycbxjQmrW5PFpdq_5P4XkYZvsXxxAwgHaTl1weS1u1eML_R8nKpMXSP6U-IDGDsazUg-duw/exec
역할: 폼 응답 저장 전용 (사용자 인증은 Firestore에서 처리)
액션:
  - doGet?action=createSheet&title=xxx&headers=[...] → 새 스프레드시트 생성
  - doPost {action:'submitForm', sheetId, headers, row} → 응답 행 추가
  - doPost {action:'bulkAppend', sheetId, rows:[[],[],[]]} → 여러 행 일괄 추가 (기존 응답 백필용)
코드: apps-script/Code.gs
⚠️ GAS 재배포 필요 시: bulkAppend 코드가 추가됐으므로 GAS 편집기에서 '기존 배포 편집 → 새 버전' 으로 재배포해야 함
```

---

### 🗂️ 전역 UI 패턴 (Global UI Patterns)

재사용 가능한 UI 컴포넌트. 새 기능에 도움말이나 패널이 필요하면 아래 패턴을 그대로 활용한다.

#### 왼쪽 도움말 패널 (Left Help Panel)

`admin/index.html`에 전역으로 구현되어 있음. 어디서든 한 줄로 호출 가능.

```javascript
// 패널 열기
openHelpPanel('제목 텍스트', '<p>내용 HTML</p>');

// 패널 닫기 (X 버튼·backdrop 클릭 시 자동 닫힘)
closeHelpPanel();
```

**구현 위치**: `admin/index.html`
- HTML: `#help-panel`, `#help-panel-backdrop` (전역, body 직하위)
- CSS: `#help-panel`, `#help-panel.open` (transform 슬라이드)
- JS: `openHelpPanel()`, `closeHelpPanel()`

**사용 규칙**:
- 도움말·가이드 용도는 항상 이 패널 사용 (새 창·alert 금지)
- 오른쪽 미리보기 패널(`.preview-side-panel`)과 구분: 도움말은 왼쪽, 미리보기는 오른쪽
- 트리거 버튼: `?` 텍스트, `prev-btn` 스타일, 해당 기능 헤더 `actions` 영역에 배치
- 내용 HTML에서 사용 가능한 스타일: `<h3>`, `<p>`, `<ul>`, `<code>`, `.badge`, `.badge.black`

#### 오른쪽 미리보기 패널 (Right Preview Panel)

```css
/* 기존 클래스 재사용 */
.preview-side-panel   /* 패널 컨테이너 */
.preview-side-panel-header  /* 헤더 (크기조절 버튼 포함) */
```
`setPreviewSize(±30)` 로 크기 조절. 프로젝트·스테이지·블록 편집 화면에서 사용 중.

---

### 📖 UI 명칭 사전 (통일 용어)

#### 컬러 시스템
| CSS 변수 | 통일 명칭 | 역할 |
|----------|----------|------|
| `--prep-bg` | **홈 배경색** | 분리형 홈화면(`#prep-screen`) 배경. 이미지 카드 상단 바 강조 컬러 기준 |
| `--body-bg` | **앱 배경색** | 앱 외부 배경(데스크탑 프레임 밖). 병합형에서는 전체 홈화면 배경 |
| `--menu-bg` | **사이드바 배경색** | 사이드 메뉴 배경 |
| `--fill-color` | **채움색** | 진행률바 등 보조 강조 |

> **분리형 이미지 카드**: 카드 헤더 바의 상태 뱃지·제목 = `--prep-bg` (홈 배경색)
> **병합형 이미지 카드**: 카드 헤더 바의 상태 뱃지·제목 = `--body-bg` (앱 배경색 = 병합형 홈화면 배경)

#### 레이아웃 유형
| 코드 값 | 통일 명칭 | 특징 |
|---------|----------|------|
| `separate` | **분리형** | 흰 카드 스타일, 홈 배경색이 전면에 보임 |
| `merged` | **병합형** | 앱 배경색이 전체 화면을 채움 |

#### 화면 구조
| HTML ID | 통일 명칭 | 설명 |
|---------|----------|------|
| `#prep-screen` | **홈화면** | 스테이지 카드 목록이 보이는 메인 화면 |
| `#guide-screen` | **스테이지 화면** | 블록 컨텐츠가 열리는 화면 |
| `#side-menu` | **사이드바** | 좌측 슬라이드 메뉴 |

#### 스테이지 카드 구성요소
| 코드 클래스 | 통일 명칭 | 설명 |
|------------|----------|------|
| `stage-card` (text displayType) | **텍스트 카드** | 일반 텍스트 제목형 스테이지 박스 |
| `stage-card` (image displayType) | **이미지 카드** | 이미지가 들어간 스테이지 박스 |
| `status-dot` | **상태 뱃지** | 동그란 진행 상태 표시 도형 (홈화면 카드용) |
| `menu-dot` | **메뉴 뱃지** | 사이드바 메뉴 항목의 상태 도형 |
| image card top bar | **카드 헤더 바** | 이미지 카드 상단 검은 띠 (제목+뱃지 포함) |
| `stage-pbar` | **진행률 바** | 완료 퍼센트 표시 막대 |

---

### 개발 현황

**완료 ✅**
- admin CMS 패널: 프로젝트 생성·편집, 스테이지 관리, 블록 에디터 (텍스트/이미지/혼합/임베드)
- 블록 에디터: 포맷바(크기·정렬·컬러 드롭다운), 배경색, 마진, 복제
- **admin 미리보기 패널 토글**: "미리보기" 버튼으로 열기/닫기, 모바일 모달 방식
- p/ 플레이어: 프로젝트 렌더링, 사용자 인증, 스테이지 탐색
- Apps Script 배포 완료 (GAS_URL 등록)
- **CTA 아이콘 크기 조정** (admin에서 24~200px 슬라이더, CSS var(--cta-icon-size))
- **CTA 미설정 시 네모 박스 제거**: ctaIconUrl 없으면 텍스트만, 진행화면 사이드메뉴 버튼 ☰ 폴백 (color:#000)
- **사이드바 position:fixed**: 모바일 주소바 대응, transform:translateX(calc(-50% - 100vw)) 완전 숨김
- **로그인 사용자 인사 문구 시스템**: greetingText + {{변수명}} 치환, 홈화면·사이드바·복귀버튼에 표시
  - admin 인증 탭에 greetingText 입력 + 변수 삽입 버튼 (클릭 → 커서 위치에 {{key}} 삽입)
- **폼 블록 빌더** (레거시, type:'form' 하위 호환 유지)
- **폼 렌더링 + 제출** (플레이어): Firestore + GAS Google Sheets 저장
- **응답 관리 모달**: 응답 목록 보기 + CSV 다운로드 + Google Sheet 연결/생성
- **블록 체크 진행률 시스템**: checkable 블록 체크 → stageProgress 저장 → 홈화면 진행률 바
- **이미지 카드 디자인**: 카드 헤더 바, 상태 뱃지, 진행률 바
- **tools/꾸미기 도구** (`tools/booth/index.html`): Canvas 기반 이미지 합성, lmp-context 연동
- **tools/계산기·가이드** (`tools/guide/index.html`): 조건부 계산식 엔진, admin 빌더
- **admin 도구 탭**: 도구 목록 → 도구별 설정 화면 (꾸미기 도구 구성, 계산기 빌더)
- **전역 도움말 패널** (`#help-panel`): openHelpPanel() / closeHelpPanel()
- **✅ 도구 블록 신설 + 폼 도구화**:
  - `tools/form/index.html` 신규 생성: cms_form_configs 기반 폼 도구 iframe
  - `type:'tool'` 블록: 블록 편집 "도구" 탭 → 폼/꾸미기/계산기 선택 → 인스턴스 선택
  - lmp-tool-complete 신호: 도구 완료 시 플레이어가 autoCheckBlock으로 자동 체크
  - admin 도구 탭에 폼 생성기 추가: 폼 목록·생성·편집·필드 빌더·응답 보기
  - lmp-context에 projectId + userId 추가, p/+block-test-demo+gmbf-poc 동기화
- **✅ 슬라이드형 도구 블록 스크롤 지원**: tool/embed 슬라이드 아이템에 overflow-y:auto 동적 적용
- **✅ noResubmit Firestore 기반 중복 방지**: `cms_users_{projectId}/{userId}.formSubmitted_{formId}` 필드로 영구 저장
- **✅ 도구 블록 완료 조건 관리자 설정**: `completeTrigger` 필드 — `tool-signal`(기본) / `open`(열면 완료) / `manual`(수동 체크만)
- **✅ 블록 텍스트 편집기 기능 확장** (이번 세션):
  - 체크 완료 텍스트 색상 커스터마이징 (`checkTextColor`)
  - 슬라이드형 세로정렬 + 긴 텍스트 스크롤 동시 지원 (flex:0 1 auto, min-height:0)
  - 텍스트 배경색(하이라이트) 지정 (`execCommand('backColor')`)
  - 이미지 링크 (이미지형 전체 / 혼합형 이미지만), 텍스트 인라인 링크
  - 선택 없이 커서만 있어도 포맷 미리 적용 (pending span 방식)
- **✅ 이미지 배치 설정** (이번 세션): 이미지형·혼합형 블록에 배치 방법 선택 추가
  - 원본비율 / 크롭채움(`cover`) / 비율유지(`contain`) / 늘려채움(`fill`)
  - 높이(px) 입력 + 9방향 기준점 그리드 (크롭채움·비율유지 시)
  - Firestore 필드: `imageFit`, `imagePosition`, `imageHeight`
- **✅ 오버레이형 텍스트 세로 정렬** (이번 세션): 상/중/하단 선택 → `overlayTextVAlign` 필드
  - 오버레이 섀도우: 위치 무관 균일 `rgba(0,0,0,.4)` 오버레이로 통일
- **✅ 일정 잡기 도구** (`tools/schedule/index.html`) 신규 구현 (이번 세션)
  - Google Calendar 연동 (GAS 경유), 타임존 지원, 슬롯 계산, 예약 Firestore 저장
  - GAS에 `getCalendars`, `getCalendarEvents`, `createCalendarEvent` 액션 추가
- **✅ 슬라이드 재진입 겹침 버그 수정** (이번 세션): `track.style.transform='translateX(0)'`
- **✅ 혼합형 오버레이 전체화면 높이** (이번 세션): `imageHeight:'full'` → `height:100svh`
  - 슬라이드형에서도 전체화면 적용 (fullH일 때 data-valign 생략)

**미확인/이슈 🔶**
- GAS `bulkAppend` 코드: `apps-script/Code.gs`에 추가됐으나 **GAS 편집기에서 재배포 필요**
  → 방법: script.google.com → 배포 → 배포 관리 → 기존 배포 편집 → 새 버전
- 일정 잡기 도구(`tools/schedule/index.html`): GAS 재배포 후 캘린더 연동 end-to-end 테스트 필요

**완료 ✅ (이번 세션 추가)**
- **브라우저 뒤로가기/앞으로가기 SPA 히스토리 네비게이션** (admin + p/ + block-test-demo + gmbf-poc)
  - `history.pushState` 적용: 프로젝트 열기 / 스테이지 편집기 / 블록 편집 모달 / 스테이지 화면(플레이어)
  - `popstate` 핸들러: `e.state.v` 기반 양방향(뒤로/앞으로) 화면 복원
  - `_navRestore` 플래그 + `.finally()` 체인으로 비동기 복원 중 `pushState` 중복 방지
  - **핵심 버그 수정**: `switchInnerTab`의 `replaceState(null,...)` 호출이 history state를 덮어쓰는 문제 → `!_navRestore` 조건 추가로 해결
  - 저장 안 된 변경 있을 때 back 시 확인 프롬프트 유지
  - 이미지 설정 모바일 1열 반응형, 블랙 텍스트 컬러 버그, 블록 중복 생성 버그, 배경색 세로 높이 버그, GIF 애니메이션 지원, 오버레이 2열 레이아웃 등 이전 세션 수정사항 포함
- **✅ 문구 생성기 도구** (`api/generate-copy.js` + `tools/copy-gen/index.html`) 기능 대폭 확장:
  - AI 모델: Gemini → Anthropic Claude (claude-haiku-4-5-20251001), `ANTHROPIC_API_KEY` 환경변수
  - 스타일 옵션 확장: 용도(purpose), 타겟독자(target), 어미(speech_level 6종) 추가
  - 어미 자동 숨김: 슬로건 형식 선택 시 말투·격식·어미 자동 비활성화
  - 참고문구 역할 토글: 스타일참고(분위기·톤만) / 유사하게작성(구조·표현 방식 참고)
  - 다양성 지시: 프롬프트에 "구조·시작 방식·표현 접근법이 서로 달라야 함" 규칙 추가
  - 중복선택 지원: 관리자가 항목별 "여러 개 선택 가능" + 최대 선택 수 설정
  - 검정 버튼 텍스트 색상: lmp-context `prepBg`(홈배경색)으로 자동 적용 (`--cg-on-black` CSS 변수)
  - 사용자당 최대 생성 횟수 제한: admin 설정 → Firestore `cms_copy_gen_usages/{configId}__{userId}` 추적 → 잔여 횟수 UI 표시
  - 장문 생성 JSON 잘림 수정: max_tokens 동적 계산 (`count × max(maxChars,150) × 3`, 최대 8192)
  - AI 배경정보 필드 (관리자 전용): 화자·역할 설명(`speakerDesc`) + 배경/컨텍스트(`aiContext`) → Claude 시스템 프롬프트에 포함
- **✅ 폼 도구 텍스트 필드 글자 수 제한** (`admin/index.html` + `tools/form/index.html`):
  - admin 폼 필드 편집 모달: string/textarea 타입에 최소/최대 글자 수 입력 추가
  - 도구 폼: maxChars → maxlength 속성으로 초과 입력 원천 차단
  - 도구 폼: 실시간 글자 수 카운터 표시 ("현재 / 최대자" 또는 "현재자 (최소 N자)")
  - 도구 폼: 제출 시 minChars 미달이면 오류 메시지 + 제출 거부
- **✅ lmp-context에 prepBg 추가** (p/ + block-test-demo + gmbf-poc 동기화):
  - `--prep-bg`는 keyColors 중 랜덤 선택값이므로 keyColors[0]과 다를 수 있음
  - `_lmpContext()`에 `prepBg` 필드 추가 → 도구에서 정확한 홈배경색 수신
- **✅ 유튜브 뮤직 재생목록 도구** (`tools/youtube-playlist/index.html`) 구현 완료:
  - YouTube Data API v3 기반 인앱 검색 (음악 카테고리)
  - 검색 결과 목록 (썸네일·제목·채널명), 선택 영상 미리 듣기 (iframe)
  - 선택 목록 구성 후 일괄 제출, 누적 제출 가능
  - Firestore 저장: `cms_youtube_submissions/{projectId}/songs/{docId}`
  - admin 도구 탭 연동: 제출 목록 조회 + CSV 내보내기 + URL 복사
  - 단일 도구(single) 분류: toolType `'youtube-playlist'`, toolConfig 불필요
  - p/index.html + admin 블록 에디터 도구 탭에 연결 완료

**미확인/이슈 🔶**
- GAS `bulkAppend` 코드: `apps-script/Code.gs`에 추가됐으나 **GAS 편집기에서 재배포 필요**
  → 방법: script.google.com → 배포 → 배포 관리 → 기존 배포 편집 → 새 버전
- 일정 잡기 도구(`tools/schedule/index.html`): GAS 재배포 후 캘린더 연동 end-to-end 테스트 필요

**완료 ✅ (이번 세션 추가)**
- **✅ 폼 응답 테이블·사용자 테이블 컬럼 드래그 조정**: 너비 드래그 리사이즈, 프로젝트/폼별 Firestore 저장, 더블클릭 초기화
  - 사용자 테이블: `cms_projects/{id}.userColumnWidths`
  - 폼 응답 테이블(레거시): `cms_projects/{id}.formRespColWidths.{formId}`
  - 폼 도구 응답 테이블: `cms_form_configs/{id}.columnWidths`
  - 모든 정보성 테이블: 헤더 sticky + 왼쪽 식별 컬럼 sticky
- **✅ 스테이지 3단계 게시 상태**: `publishStatus` — 'published'(게시) / 'disabled'(비활성화·회색+클릭불가) / 'hidden'(완전숨김)
  - admin 스테이지 목록에 3버튼 그룹, player 3파일 동기화
  - 저장 버그 수정: `_autoSaveStage`·`saveStageContent` → `updatedStages`에 `publishStatus` 포함
- **✅ 블록 편집 미리보기 체크 기능 표시**: `_gBlockCore` + `_adminCheckEl` + `gBlockHtml` 래퍼 구조로 재설계
- **✅ 체크 위치 기본값 → 하단 중앙**: `bottom-right` → `bottom-center` (admin/index.html 전체)
- **✅ Firestore 보안 규칙 수정 (Firebase Console)**: `cms_form_configs` 쓰기 권한 추가
  - 원인: 두 번째 관리자 계정(`itsbeybusiness@gmail.com`)은 catch-all 규칙(`baekeun0@gmail.com` 전용) 미적용
  - 추가된 규칙: `cms_form_configs/{document=**}` write, `cms_youtube_submissions/{document=**}` write, `cms_copy_gen_usages/{document=**}` write
- **✅ 폼 응답 관리 인라인 통합**: 폼 편집 화면 하단에 응답 목록·시트 관리 통합 (별도 모달 제거)
  - 목록의 "📋 응답" 버튼 → 편집 화면으로 이동 (응답 포함 자동 로드)
  - 구글 시트 연결/해제/새 시트 생성 편집 화면에서 직접 처리
- **✅ 도구 블록 전체화면 높이 옵션**: 자동/전체화면(100svh)/직접입력 버튼 그룹
  - admin 블록 에디터 + p/block-test-demo/gmbf-poc 플레이어 동기화
- **✅ 폼 필드 폰트 크기 조정**: 제목 13→15px, 설명 12→10px
  - tools/form/index.html + p/block-test-demo/gmbf-poc 모두 적용
- **✅ SNS/카카오 공유 미리보기 (OG 메타태그)**: 프로젝트 기본 정보에 제목·설명·이미지 필드 추가
  - 배포 시 `<!-- OG_META -->` 플레이스홀더에 자동 주입 (저장만으로는 반영 안 됨, 배포 필요)
  - `<title>` 태그도 OG 제목으로 자동 교체
- **✅ 게시/비공개 스테이징**:
  - 프로젝트 단위: "게시 상태" 토글 + 미리보기 토큰 URL (`?preview=TOKEN`)
  - 스테이지 단위: 스테이지 목록 우하단 "✓ 게시됨 / 🔒 비공개" 버튼
  - `published === false` → 사용자에게 "🔒 준비 중이에요" 화면
  - `previewToken` Firestore 저장, 저장 시 없으면 자동 생성 (8자 랜덤)
  - player (p/block-test-demo/gmbf-poc) 모두 동기화
- **✅ 로그인 트래킹**: 로그인 성공 시 `lastLoginAt` + `loginCount` Firestore 업데이트
  - admin 사용자 목록에 "최근 로그인" · "횟수" 컬럼 추가
- **✅ 관리자 프리뷰 모드** (`?admin=TOKEN` URL 파라미터):
  - Firestore `cms_admin_settings/github.adminPreviewToken` 저장 (admin 로그인 시 자동 생성, `adm_` prefix + 랜덤 10자)
  - 관리자 패널 프로젝트 편집 화면 "게시 상태" 섹션에 빨간 테두리의 "🛠 관리자 미리보기 URL" 박스 추가 (복사 버튼)
  - 플레이어에 토큰 파라미터로 접근하면:
    - `published===false` 프로젝트도 "준비 중" 화면 건너뛰고 정상 표시
    - `publishStatus==='hidden'` 스테이지 목록에 노출 (점선 빨간 테두리 + "숨김" 뱃지)
    - `publishStatus==='disabled'` 스테이지 클릭 가능 (회색 처리 유지 + "비활성" 뱃지)
    - `authEnabled` 프로젝트도 인증 모달 건너뛰고 바로 진입
  - 화면 상단에 "🛠 관리자 미리보기 모드 · 비활성·숨김 스테이지 진입 가능" 빨간 배너 고정 표시
  - p/index.html + block-test-demo + gmbf-poc 동기화 완료

**완료 ✅ (이번 세션 추가)**
- **✅ 사이드바 로그아웃**: 인증 프로젝트 사이드바 하단에 "로그아웃" 버튼 추가
  - 클릭 시 `sessionStorage.userSession` 삭제 → 페이지 새로고침 → 인증 모달 재표시
  - 관리자 프리뷰 모드(`IS_ADMIN_PREVIEW`)이거나 `AUTH_ENABLED=false`이면 버튼 숨김
  - `#menu-footer` div + `logout()` 함수, p/index.html + block-test-demo + gmbf-poc 동기화
- **✅ 등록 CTA 별도 표시**: admin 인증 탭 "사용자 직접 등록" 하위에 "홈화면에 등록 CTA 별도 표시" 토글 추가
  - ON이면 홈화면 로그인 CTA 옆에 등록하기 CTA 버튼 별도 표시 (동일 규격: 아이콘+텍스트)
  - 등록 CTA 전용 아이콘 URL 입력 + 직접 업로드 + 텍스트 설정 가능
  - 클릭 시 등록 모달 직접 오픈 (인증 모달 건너뜀)
  - Firestore 필드: `selfRegCtaSeparate`, `selfRegCtaIconUrl`, `selfRegCtaSepText`
  - p/index.html + block-test-demo + gmbf-poc 동기화
- **✅ 테이블 열 고정 범위 선택**: 사용자 테이블·폼 응답 테이블·도구 응답 테이블에 열 고정 칩 바 추가
  - 테이블 상단에 칩 버튼 (없음 / 첫 번째 열 이름 / 두 번째 열 이름 / ...) 표시
  - 선택 시 해당 열까지 `position:sticky` 고정, 마지막 고정 열 오른쪽에 box-shadow
  - 설정 localStorage 저장: `fc_user_{projId}`, `fc_resp_{projId}_{formId}`, `fc_tf_{configId}`
  - `_frozenChipBar()`, `_colWidthDefaultPx()`, `setUserFrozen()`, `setRespFrozen()`, `setTfFrozen()` 구현

**진행 예정 🔲**
- GAS 재배포 후 시트 생성 + 백필 end-to-end 테스트
- 도구 블록 end-to-end 테스트 (폼 생성 → 블록 연결 → 플레이어 제출 → 진행률 반영)
- 일정 잡기 도구 end-to-end 테스트 (GAS 재배포 후)
- 관리자 프리뷰 모드 end-to-end 테스트 (admin에서 URL 복사 → 시크릿창 접속 → 비공개·비활성·숨김 스테이지 진입 확인)

**다음 세션 시작점**
- 🔲 관리자 프리뷰 모드 실제 테스트 + 기존 배포 프로젝트 재배포 (admin 패널에서 "저장 + 배포")
- 🔲 일정 잡기 도구 end-to-end 테스트 (GAS 재배포 후)
- PAT: 만료 시 재발급 필요 (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → repo 권한)

#### 📐 ✅ 완료된 구현: 유튜브 뮤직 재생목록 도구

> 구현 완료. 참고용으로 보존.

- **파일**: `tools/youtube-playlist/index.html` (단일 도구, 인스턴스 선택 없음)
- **도구 분류**: 단일 도구 (toolType:`'youtube-playlist'`, toolConfig 불필요)
- **admin 블록 에디터**: 도구 탭 `'유튜브 뮤직'` 버튼으로 연결, `SINGLE_TOOL_TYPES` 배열에 포함

---

### 📐 ✅ 완료된 구현: 도구 블록 신설 + 폼 도구화

> 이 섹션은 구현 완료됐습니다 (2026-05-07 세션). 참고용으로 보존합니다.

#### 배경 및 목적
- 현재 `type:'form'` 블록을 제거하고 새 `type:'tool'` 도구 블록으로 통합
- 폼 관리(필드 빌더, 응답 관리)를 admin 도구 탭으로 이동
- 도구 블록 완료(lmp-tool-complete) → 진행률 자동 카운트 연동

#### 1. 도구 분류 체계 (앞으로 모든 신규 도구에 적용)

| 분류 | 설명 | 현재 해당 도구 |
|------|------|--------------|
| **단일 도구(single)** | 인스턴스 선택 없이 도구 종류만 선택하면 바로 연결 | (현재 없음) |
| **선택 도구(multi)** | 도구 종류 선택 후 → 생성된 인스턴스 목록에서 하나 선택 | 폼, 꾸미기 도구, 계산기·가이드 |

- admin에서 새 도구를 등록할 때 이 분류를 명시해서 블록 편집 UI가 자동으로 맞춰지게 구현

#### 2. 신규 블록 타입: `type:'tool'`

```javascript
// Firestore stage_content blocks[] 안의 도구 블록 구조
{
  id: uid(),
  type: 'tool',
  toolType: 'form' | 'booth' | 'guide',   // 도구 종류
  toolConfig: {
    formId: 'xxx',    // form 선택 시: cms_form_configs의 문서 ID
    boothId: 'xxx',   // booth 선택 시: game_configs/booth booths[] 중 선택한 ID
    guideId: 'xxx',   // guide 선택 시: game_configs/guide/forms의 문서 ID
  },
  height: 0,          // iframe 높이 px (0=자동 → min-height:60vh)
  order: number,
  bgColor: '',
  marginV: 0,
  marginH: 0,
  // checkable 필드는 도구 블록에서 무시 (lmp-tool-complete로 대체)
}
```

#### 3. 도구별 iframe URL 규칙

| toolType | URL | 비고 |
|----------|-----|------|
| `form` | `/tools/form/?id={toolConfig.formId}` | 신규 파일 생성 필요 |
| `booth` | `/tools/booth/?id={toolConfig.boothId}` | 기존 파일에 id 파라미터 추가 |
| `guide` | `/tools/guide/?id={toolConfig.guideId}` | 기존 파일에 id 파라미터 수신 확인 |

#### 4. postMessage 프로토콜 확장

**플레이어 → 도구 (기존 lmp-context에 projectId 추가)**
```javascript
f.contentWindow.postMessage({
  type: 'lmp-context',
  projectId: PROJECT_ID,   // ← 추가 (플레이어 전역변수 PROJECT_ID 사용)
  boothType: user?.boothType || '',
  keyColors: KEY_COLORS,
  userFields: user || {},
}, '*');
```
- PROJECT_ID가 현재 플레이어에 없다면 `loadProjectSettings()` 에서 `let PROJECT_ID = ''` 글로벌 변수로 추가하고 프로젝트 로드 시 설정

**도구 → 플레이어 (완료 신호)**
```javascript
// 각 도구에서 완료 시점에 발송
window.parent.postMessage({ type: 'lmp-tool-complete' }, '*');
```

**완료 시점 기준**
| 도구 | 완료 시점 | 코드 위치 |
|------|----------|----------|
| 폼 | 폼 제출 성공 후 | `submitForm()` 성공 분기 |
| 꾸미기 도구 | "완성" 버튼 클릭 (export 모달 열릴 때) | `openExport()` 함수 첫 줄 |
| 계산기·가이드 | 결과 화면 렌더링 시 | `showResult()` 함수 첫 줄 |

#### 5. 플레이어 변경 (p/index.html + block-test-demo/ + gmbf-poc/ 동기화 필수)

**checkableCount 계산 수정**
```javascript
// 기존 (admin/index.html과 p/index.html 두 곳 모두 수정)
const actualCnt = blocks.filter(b => b.checkable || b.type === 'form').length;
// 변경
const actualCnt = blocks.filter(b => b.checkable || b.type === 'form' || b.type === 'tool').length;
```

**블록 렌더링에 type:'tool' 추가**
```javascript
// blockHtml() 함수 안, type:'embed' 처리 다음에 추가
if(b.type === 'tool') {
  const toolUrls = {
    form:  `/tools/form/?id=${b.toolConfig?.formId||''}`,
    booth: `/tools/booth/?id=${b.toolConfig?.boothId||''}`,
    guide: `/tools/guide/?id=${b.toolConfig?.guideId||''}`,
  };
  const src = toolUrls[b.toolType] || '';
  const h = b.height || 0;
  const heightCss = h ? `height:${h}px` : `min-height:60vh`;
  return `<iframe src="${src}" style="width:100%;${heightCss};border:none;display:block;" allowfullscreen data-tool-block="${b.id}"></iframe>`;
}
```

**lmp-tool-complete 수신 처리 (window.addEventListener('message') 핸들러에 추가)**
```javascript
// 기존 lmp-ready 처리 핸들러와 별개로 또는 같은 핸들러 안에서 분기
if(e.data?.type === 'lmp-tool-complete') {
  document.querySelectorAll('iframe[data-tool-block]').forEach(f => {
    try {
      if(f.contentWindow === e.source) {
        autoCheckBlock(f.getAttribute('data-tool-block'));
      }
    } catch(_) {}
  });
  return;
}
```

**autoCheckBlock() 함수 신규 추가**
```javascript
function autoCheckBlock(blockId) {
  if(!blockId) return;
  const stageId = curStageId;
  if(!userProgress[stageId]) userProgress[stageId] = new Set();
  if(userProgress[stageId].has(blockId)) return; // 이미 완료
  userProgress[stageId].add(blockId);
  refreshStageProgress();
  if(!AUTH_ENABLED || !USER_DOC_ID) return;
  const u = JSON.parse(sessionStorage.getItem('userSession') || '{}');
  if(!u.stageProgress) u.stageProgress = {};
  u.stageProgress[stageId] = [...userProgress[stageId]];
  sessionStorage.setItem('userSession', JSON.stringify(u));
  db.collection(AUTH_COLLECTION).doc(USER_DOC_ID).update({
    ['stageProgress.' + stageId]: firebase.firestore.FieldValue.arrayUnion(blockId)
  }).catch(console.error);
}
```

**하위 호환**: `type:'form'` 블록은 기존 inline 렌더링 그대로 유지 (코드 삭제 금지)

#### 6. 신규 파일: tools/form/index.html

- URL 파라미터: `?id={formId}`
- Firestore에서 `cms_form_configs/{formId}` 읽어 폼 렌더링
- 스타일: `body { background: transparent }` + 검정(#000) 테두리, lmp-btn 스타일 (부스 도구 방식)
- lmp-context 수신: projectId, userFields 저장 → 제출 시 포함
- 제출 저장: `cms_form_responses/{formId}/responses/` 에 `{ submittedAt, projectId, userId, ...fieldValues }`
- GAS 연동: `formConfig.sheetId` 있으면 기존 submitForm 방식과 동일하게 GAS_URL POST
- 재제출 방지: `noResubmit=true`면 sessionStorage `form_done_{formId}` 키 확인
- 제출 성공 시: `window.parent.postMessage({ type: 'lmp-tool-complete' }, '*')` 발송 후 완료 화면 표시
- 완료 화면: formConfig.submitMsg (HTML) 렌더링

#### 7. 기존 도구 파일 수정

**tools/booth/index.html**
- `openExport()` 함수 맨 앞에 추가:
  ```javascript
  window.parent.postMessage({ type: 'lmp-tool-complete' }, '*');
  ```
- URL 파라미터 `?id={boothId}` 수신 기능 추가 (현재 boothId 개념 미구현 → 추후)
  - 우선은 무시해도 됨, 도구 블록에서 booth 선택 시 boothId 없이도 동작하게

**tools/guide/index.html**
- `showResult()` 함수 (결과 화면 렌더링) 맨 앞에 추가:
  ```javascript
  window.parent.postMessage({ type: 'lmp-tool-complete' }, '*');
  ```
- URL 파라미터 `?id={guideId}` 수신: 이미 `vs.formId`로 구현됐는지 확인 후 없으면 추가

#### 8. admin/index.html 변경

##### 8-1. 도구 탭에 폼 관리 섹션 추가

도구 탭 안에 "폼" 항목 추가 (꾸미기 도구, 계산기·가이드와 같은 레벨):
- 폼 목록: `cms_form_configs` 전체 조회, 폼 이름·필드수 표시
- "새 폼 만들기" 버튼 → 폼 이름 입력 → Firestore에 빈 폼 문서 생성 → 편집 화면으로 이동
- 폼 편집 화면:
  - 폼 이름(title) 입력
  - 필드 빌더 (기존 `#blk-form` 안의 필드 추가/편집/삭제 UI를 여기로 이동)
  - 제출 버튼 텍스트, 완료 메시지, 재제출 방지, Google Sheet 연결/생성
  - 응답 보기 (기존 form-resp-modal 기능)
- 기존 `openFieldModal()`, `saveField()`, `removeField()` 등 폼 블록 전용 함수들을 도구 탭 폼 편집 맥락으로 이동/재활용

##### 8-2. 블록 편집에 "도구" 탭 추가

블록 타입 탭 버튼에 "도구" 추가:
```html
<button class="blk-tab" id="btab-tool" onclick="switchBlkTab('tool')">도구</button>
```

도구 탭 패널 (`#blk-tool`) 구조:
1. **도구 종류 선택** (라디오 버튼 또는 버튼 그룹):
   - 폼 / 꾸미기 도구 / 계산기·가이드
2. **인스턴스 선택 드롭다운** (선택한 도구 종류에 따라 동적 로드):
   - 폼: `cms_form_configs` 목록 + "도구 탭에서 새 폼 만들기" 링크
   - 꾸미기 도구: `game_configs/booth` booths[] 목록
   - 계산기·가이드: `game_configs/guide/forms` 목록
3. **높이 설정**: px 입력 (0=자동)

##### 8-3. 기존 폼 블록 탭 제거

- `btab-form` 탭 버튼 제거
- `#blk-form` 패널 제거 (단, 필드 빌더 UI 코드는 도구 탭 폼 편집으로 이전)
- `form-field-modal` (`#form-field-modal`) 유지 (도구 탭 폼 편집에서 재사용)
- `form-resp-modal` (`#form-resp-modal`) 유지 (도구 탭으로 이전)
- `checkableCount` 저장 로직: `b.type==='form'` 조건 유지 (하위 호환)

##### 8-4. 블록 목록 렌더링 수정

```javascript
// 블록 타입 표시 레이블
const tl = b.type==='text' ? '텍스트'
         : b.type==='image' ? '이미지'
         : b.type==='mixed' ? '혼합'
         : b.type==='embed' ? '임베드'
         : b.type==='tool'  ? '도구'
         : b.type==='form'  ? '폼(구)' : '';  // 레거시 폼 블록 식별

// 도구 블록 서브 라벨
const subLbl = b.type==='tool'
  ? `${b.toolType} · ${b.toolConfig?.formId || b.toolConfig?.boothId || b.toolConfig?.guideId || ''}`
  : b.type==='form' ? (b.formFields?.length ? `필드 ${b.formFields.length}개` : '(필드 없음)') : '';
```

#### 9. vercel.json 추가

```json
{ "source": "/tools/form/:path*", "destination": "/tools/form/index.html" }
```
기존 `/tools/:path*` 라우팅과 충돌 여부 확인 후 추가 (tools/form이 더 구체적이므로 앞에 배치)

#### 10. 작업 순서 (권장)

1. `tools/form/index.html` 신규 생성
2. `tools/booth/index.html` — `openExport()` 에 lmp-tool-complete 추가
3. `tools/guide/index.html` — `showResult()` 에 lmp-tool-complete 추가
4. `p/index.html` — tool 블록 렌더링 + autoCheckBlock + lmp-tool-complete 수신 + projectId in context
5. `admin/index.html` — 도구 탭 폼 섹션 추가 + 블록 편집 도구 탭 추가 + 폼 블록 탭 제거
6. `block-test-demo/index.html`, `gmbf-poc/index.html` — p/와 동기화
7. `vercel.json` — /tools/form/ 라우팅 추가
8. CLAUDE.md 갱신 (이 섹션을 완료 항목으로 이동)

---

### ⚠️ 세션 종료 규칙 요약

위 "🔴 세션 종료 시 자동 수행" 절차를 따른다. 사용자가 명시적으로 종료 의사를 밝혀야 CLAUDE.md를 갱신한다.
