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

### 🛠️ 신규 도구 설계 규칙 (글로벌, 예외 없음)

새 도구(`tools/*/index.html`)를 만들 때 반드시 아래 규칙을 지킨다.

#### 1. lmp-context 수신 — 사용자 필드 데이터 추출

```javascript
// ✅ 올바른 구현 — 반드시 이 패턴 사용
let ctxProjectId = '';
let ctxUserId = '';
let ctxUserFields = {};

window.addEventListener('message', e => {
  if (e.data?.type !== 'lmp-context') return;
  ctxProjectId  = e.data.projectId  || '';
  ctxUserId     = e.data.userId     || '';
  ctxUserFields = e.data.userFields || {};
  // 필요 시: blockBg, keyColors, prepBg도 여기서 처리
});
window.parent.postMessage({ type: 'lmp-ready' }, '*');
```

- `e.data.userFields`에는 로그인 사용자의 Firestore 문서 데이터 전체가 담겨 있음
- `e.data.userId`는 사용자의 Firestore 문서 ID (noResubmit 체크, 기록 저장에 사용)
- `e.data.projectId`는 도구가 속한 프로젝트 ID

#### 2. 이미지 썸네일에 crossorigin 금지

모달/그리드에서 썸네일로만 표시하는 `<img>` 태그에는 `crossorigin` 속성을 붙이지 않는다.
Firebase Storage 이미지는 CORS 설정에 따라 `crossorigin="anonymous"` 시 로딩이 실패할 수 있다.

```html
<!-- ❌ 잘못된 예 — 썸네일이 안 뜰 수 있음 -->
<img src="${url}" crossorigin="anonymous">

<!-- ✅ 올바른 예 — 표시용 썸네일은 CORS 속성 없이 -->
<img src="${url}">
```

`crossorigin="anonymous"`는 canvas에 `drawImage()` 해야 할 때만, **JS 코드에서** `img.crossOrigin = 'anonymous'` 형태로 쓴다.

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

- **🔑 PAT 확인:**
  ```bash
  git remote -v
  ```
  GitHub MCP 도구로 PR/머지 작업을 하므로 PAT은 git remote 기반 push에만 필요. 출력된 origin URL이 `local_proxy@127.0.0.1...` 형식이면 정상 (이 환경에서는 GitHub MCP가 우회 채널).

- **🌿 작업 브랜치 확인:**
  ```bash
  git branch --show-current
  ```
  시스템이 자동으로 만든 `claude/...` feature 브랜치 위에 있을 것이다. **이 브랜치에 머무른다.** main으로 checkout하지 않는다.

- **⬇️ origin/main 최신 상태로 자동 동기화:**
  ```bash
  git fetch origin main
  git log HEAD..origin/main --oneline
  ```
  결과가 있으면 → main이 feature 브랜치보다 앞서 있다는 뜻 → **세션 시작 시점엔 아직 작업이 없으므로 묻지 않고 자동으로 리셋:**
  ```bash
  git reset --hard origin/main
  ```
  이렇게 하면 이전 세션 머지된 내용이 현재 feature 브랜치에 반영되고, 유실되는 작업은 없다 (새 세션에서 아직 아무것도 안 했으므로).

- **⚠️ 절대 시도 금지:**
  - `git checkout main` 후 작업 (다시 feature로 복귀 못 할 수 있음)
  - `git push origin main` (HTTP 403)
  - `git push origin <feature>:main` (HTTP 403)
  - local main에 force-push (origin/main이 손상될 수 있음)

- **배포 = PR 머지 방식:**
  세션 중 또는 마무리 시, 사용자가 "배포" 또는 "메인 반영" 요청 시:
  ```
  mcp__github__create_pull_request  →  mcp__github__merge_pull_request
  ```
  머지 후 `git fetch origin main && git reset --hard origin/main`로 로컬 동기화.

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
3. 승인 후 커밋 + push:
   - Remote 세션(☁️): `git add [변경 파일] && git commit -m "..." && git push -u origin <현재 feature 브랜치>`
   - Local 세션(💻): main 직접 push 시도 → 403이면 feature 브랜치로 push 후 4번으로
   - ⚠️ `git add .` / `git add -A` 금지
4. **main으로 머지 — 세션당 딱 1번, 여기서만:**
   - `mcp__github__create_pull_request` (head: 현재 브랜치, base: main)
   - 사용자에게 PR URL 보여주고 확인
   - `mcp__github__merge_pull_request` (PR 번호, method: merge)
   - `git fetch origin main && git reset --hard origin/main` (로컬 동기화)
   - ⚠️ 이 단계가 세션 전체에서 PR 머지가 일어나는 **유일한 시점**이다. 중간에 절대 하지 않는다.
5. Vercel 자동 배포 안내 (~1분 후 Ctrl+Shift+R)
6. CLAUDE.md 직접 갱신 (완료 단계 ✅, 다음 시작점 업데이트)
7. CLAUDE.md 갱신분도 동일 절차로 push + PR 머지 (CLAUDE.md 갱신 = 세션 마무리의 일부이므로 별도 PR 불필요 — 같은 PR에 포함하거나 바로 이어서 1번 더 머지)
8. PAT 설정된 경우 현재 PAT 출력
9. **다음 세션 시작 프롬프트 출력** — 아래 템플릿 사용:

```
환경 확인: Remote(☁️)인지 Local(💻)인지 먼저 판별해줘.
Remote라면 시스템이 자동 생성한 feature 브랜치(claude/...)에서 작업하고,
배포 시점에 `mcp__github__create_pull_request` + `mcp__github__merge_pull_request`로 main에 머지하는 방식이야.
`git push origin main` 직접 시도는 403으로 거부되니까 절대 시도하지 말아줘.
(상세 규칙은 CLAUDE.md "브랜치 운영 규칙" 섹션 참고)

PAT: ghp_xxx (만료됐으면 재발급 요청)

이번 세션 작업: [작업 내용]
```

---

### ⚠️ 브랜치 운영 규칙 (환경별로 다름 — 반드시 확인)

이 프로젝트는 **`main` 브랜치 = 배포 브랜치**다 (Vercel이 `main`을 지켜본다).
하지만 작업 방식은 실행 환경에 따라 다르므로, 세션 시작 시 환경을 먼저 판별하고 그에 맞게 진행한다.

#### ☁️ Remote 세션 (Claude Code 웹/Code 탭)

**환경 특성:**
- 시스템이 자동으로 `claude/...` feature 브랜치를 만들고 그 위에 작업하도록 강제한다.
- `git push origin main`이 **HTTP 403으로 차단된다** (local proxy 정책).
- 따라서 `main` 직접 작업은 불가능하다.

**올바른 워크플로우:**
1. 시스템이 만든 feature 브랜치에서 그대로 작업 (예: `claude/add-xxx-feature-yyy`)
2. 커밋·push는 feature 브랜치로 (push 1회 = 배포 1회 소비)
   ```bash
   git push -u origin claude/...
   ```
3. **세션 마무리 시점에 딱 1번만 PR 생성 + 머지:**
   ```
   mcp__github__create_pull_request  (head: claude/..., base: main)
   mcp__github__merge_pull_request   (방금 생성된 PR 번호, method: merge)
   ```
4. 머지 직후 로컬 동기화:
   ```bash
   git fetch origin main && git reset --hard origin/main
   ```
5. Vercel 자동 배포 시작 (~1분)

**🔴 PR 머지 횟수 절대 원칙 — 어떤 상황에서도 예외 없음:**
- **한 세션 = PR 머지 1번** (세션 마무리 시에만)
- 사용자가 "확인해봐", "배포해봐", "라이브로 보고 싶어" 라고 해도 → **"세션 끝에 한번에 배포할게요"라고 안내하고 mid-session 머지 금지**
- 작은 버그 수정이라도 중간에 PR을 만들지 않는다. 커밋만 쌓고 마지막에 한번에 머지
- 이 규칙을 어기면 PR 1개당 최소 2회 배포 소비 → 10개면 20회 → 100회/일 한도 초과

> 🔴 **실제 사고 사례**: 이전 세션에서 버그 수정마다 PR을 머지(#86~#95, 총 10회)해서 당일 Vercel 배포 100회 한도를 초과했다. 당일 오픈 예정인 기능이 배포 불가 상태가 됐다. 이 실수를 반복하지 않는다.

**⚠️ 절대 하지 말 것:**
- `git checkout main && git push origin main` ← 403으로 거부됨
- `git push origin <feature>:main` ← cross-branch push도 403
- local `main`이 origin/main과 갈라져 보여도 **함부로 force-push 금지** (과거 미push 잔재일 수 있음 — 먼저 `git log` 확인)
- **mid-session PR 머지** ← Vercel 배포 한도 소진의 주범

#### 💻 Local 세션 (터미널에서 직접)

PAT 인증이 있을 경우 `main` 직접 push가 가능할 수 있다. 단, 시도 전 PAT 권한과 GitHub 측 branch protection 룰을 확인하고, 안 되면 Remote 세션과 동일하게 PR 머지 방식으로 진행한다.

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

### ⚠️ Vercel 배포 횟수 제한 (Free 플랜: 하루 100회)

Vercel Free 플랜은 **하루 배포 100회 제한**이 있다. feature 브랜치 push 1회 + PR 머지 1회 = 최소 2회 소모. 세션 중 PR을 잘게 나누면 금방 소진된다.

#### 예방 원칙 (필수)

- **세션 중에는 feature 브랜치에 커밋·push만** 한다 (Preview 배포 1회 소모)
- **PR 머지는 세션 마무리 시 딱 1번만** — 중간중간 머지 금지
- 한 세션 = 커밋 여러 개 + **PR 1개** 원칙

#### 제한 초과 시 대처

1. **오늘 안에 배포가 꼭 필요한 경우**: Vercel 대시보드에서 플랜을 **Pro로 업그레이드** (월 $20) → Promote to Production → 필요 없으면 다시 Free로 다운그레이드
2. **급하지 않은 경우**: 24시간 기다리면 자동 리셋 → Vercel 대시보드에서 최신 Preview 배포의 "Promote to Production" 클릭
3. **제한 초과 여부 확인**: Vercel 배포 목록에서 Production(Current)이 오래된 커밋에 멈춰 있으면 의심

---

### 현재 시스템 구조 (실제 코드 기준)

#### 파일 구조
```
lmp-website/
├── admin/index.html       ← 관리자 CMS 패널 (lazymaxpotential.kr/admin/)
├── p/index.html           ← 프로젝트 플레이어 (lazymaxpotential.kr/{project-id}/)
├── tools/
│   ├── booth/             ← 꾸미기 도구 (Canvas 기반 이미지 합성)
│   ├── form/              ← 폼 도구 (cms_form_configs 기반)
│   ├── guide/             ← 계산기·가이드 도구
│   ├── schedule/          ← 일정 잡기 도구 (Google Calendar 연동)
│   ├── payment/           ← 결제 도구 (페이업 PayUp)
│   ├── copy-gen/          ← 문구 생성기 (Claude AI)
│   └── youtube-playlist/  ← 유튜브 뮤직 재생목록
├── api/
│   ├── confirm-payup.js   ← 페이업 결제 승인 서버 엔드포인트 (Vercel function)
│   ├── confirm-payment.js ← 구 토스페이먼츠 서버 검증 (미사용, 보존 중)
│   └── generate-copy.js   ← 문구 생성 API (Vercel function, Anthropic)
├── apps-script/Code.gs    ← Google Apps Script 코드 (폼 응답 → 시트 저장용)
├── block-test-demo/       ← 테스트용 배포 프로젝트 (p/index.html 동기화 필요)
├── gmbf-poc/              ← 기존 배포 프로젝트 (p/index.html 동기화 필요)
├── gmbf/po-c/index.html   ← 구 플리마켓 셀러 포털 (별도 운영)
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
  ctaIconUrl, ctaText, ctaIconSize  ← ctaIconSize: 24~200px
  ddayEnabled, ddayDate
  authEnabled, authCollection, authFields, authKeyField, authTitle, authDesc
  authMode: 'normal' | 'lazy'  ← 'lazy': 비로그인 둘러보기 + 동작 시점 로그인 요청
  greetingText: string  ← 로그인 후 인사 문구 ({{필드키}} 변수 치환 지원)
  bgImages: [{url, overlay, timing}]
  stages: [{id, title, displayType, stageImageUrl, order,
            trackProgress: boolean,
            checkableCount: number,
            publishStatus: 'published'|'disabled'|'hidden'}]
  stats: [{id, label, collection, countType, unit, enabled}]
  elementOrder: string[]
  keyColors: string[]
  published: boolean  ← 프로젝트 공개 여부
  previewToken: string  ← 비공개 미리보기 URL 토큰
  selfRegCtaSeparate, selfRegCtaIconUrl, selfRegCtaSepText  ← 등록 CTA 별도 표시
  ogTitle, ogDescription, ogImageUrl  ← SNS 공유 미리보기 (OG 메타태그)
  userColumnWidths: object  ← 사용자 테이블 컬럼 너비 (admin)
  updatedAt: timestamp

cms_projects/{projectId}/stage_content/{stageId}
  displayType: 'scroll' | 'slide'
  blocks: [{
    id, type ('text'|'image'|'mixed'|'embed'|'form'|'tool'), order,
    textContent, imageUrl, mixedLayout, embedUrl, embedHeight,
    bgColor, marginV, marginH, linkUrl,
    checkable,        ← 사용자 체크 가능 여부
    checkTextColor,   ← 체크 완료 텍스트 색상
    imageFit, imagePosition, imageHeight,  ← 이미지 배치 설정
    overlayTextVAlign,  ← 오버레이형 텍스트 세로 정렬
    -- type:'form' 전용 (레거시, 하위 호환 유지) --
    formId, formTitle, formFields[], formConfig{submitBtnText,noResubmit,sheetId,sheetTab}
    -- type:'tool' 전용 (신규) --
    toolType,      ← 'form' | 'booth' | 'guide' | 'schedule' | 'payment' | 'copy-gen' | 'youtube-playlist'
    toolConfig,    ← { formId?, boothId?, guideId?, scheduleId?, paymentId?, copyGenId? }
    height,        ← iframe 높이 px (0=자동, 'full'=100svh)
    completeTrigger,  ← 'tool-signal'(기본) | 'open'(열면 완료) | 'manual'(수동만)
  }]

cms_users_{projectId}/{userId}
  (프로젝트별 authFields에 따라 자유 구조)
  stageProgress: {stageId: [blockId, ...]}
  lastLoginAt, loginCount
  paidConfigs: { [configId]: { paidAt, amount, tier, paymentKey, orderId } }
  paidTiers: string[]

cms_form_configs/{formId}
  title, fields[], submitBtnText, submitMsg (HTML), noResubmit, sheetId, sheetTab
  columnWidths: object  ← 응답 테이블 컬럼 너비 (admin)
  createdAt, updatedAt

cms_form_responses/{formId}/responses/{responseId}
  submittedAt, userId, projectId, ...fieldValues

game_configs/booth                  ← 꾸미기 도구 구성
  booths: [{id, name, ...}]

game_configs/guide/forms/{formId}   ← 계산기·가이드 폼 설정

cms_admin_settings/github
  pat: string
  adminPreviewToken: string  ← 관리자 프리뷰 URL 토큰 (adm_ prefix)

cms_admin_settings/payment
  payupMerchantId: string  ← 페이업 가맹점 ID (Vercel 환경변수 PAYUP_MERCHANT_ID와 동일값)
  payupTestMode: boolean   ← 테스트 모드 여부 (Vercel 환경변수 PAYUP_TEST와 연동)

cms_payment_configs/{configId}
  title, productName, amount, description, tier, successMessage
  createdAt, updatedAt

cms_payment_records/{paymentKey}
  paymentKey, orderId, orderName, amount, method, status, approvedAt
  configId, configTitle, tier, projectId, userId, userFields
  createdAt

cms_youtube_submissions/{projectId}/songs/{docId}
  ← 유튜브 재생목록 도구 제출 기록

cms_copy_gen_usages/{configId}__{userId}
  ← 문구 생성기 사용 횟수 추적
```

#### Firestore 보안 규칙 (현재 적용된 것 기준)
```
match /cms_form_responses/{document=**} { allow write: if true; allow read: if true; }
match /{col}/{doc} { allow read, write: if col.matches('cms_users_.*'); }
match /cms_form_configs/{document=**} { allow write: if true; }
match /cms_youtube_submissions/{document=**} { allow write: if true; }
match /cms_copy_gen_usages/{document=**} { allow write: if true; }
```

#### 외부 연동
| 연동 | 용도 |
|------|------|
| **Firebase Firestore** | 모든 데이터 저장 (프로젝트, 사용자, 폼 응답) |
| **Firebase Storage** | 이미지 업로드 |
| **Google Apps Script** | 폼 응답 → Google Sheets 저장 전용 |
| **GitHub API** | 관리자 저장+배포 (p/{id}/index.html 자동 생성) |
| **Anthropic Claude API** | 문구 생성기 (claude-haiku-4-5-20251001) |
| **페이업 (PayUp)** | 결제 도구 (`api/confirm-payup.js`, Vercel 환경변수: PAYUP_MERCHANT_ID / PAYUP_API_KEY / PAYUP_TEST) |
| **YouTube Data API v3** | 유튜브 뮤직 검색 |
| **Google Calendar (GAS)** | 일정 잡기 도구 |

#### Apps Script 정보
```
URL: https://script.google.com/macros/s/AKfycbxjQmrW5PFpdq_5P4XkYZvsXxxAwgHaTl1weS1u1eML_R8nKpMXSP6U-IDGDsazUg-duw/exec
역할: 폼 응답 저장 + Google Calendar 연동 (일정 잡기 도구)
액션:
  - doGet?action=createSheet&title=xxx&headers=[...]  → 새 스프레드시트 생성
  - doPost {action:'submitForm', sheetId, headers, row}  → 응답 행 추가
  - doPost {action:'bulkAppend', sheetId, rows:[...]}  → 여러 행 일괄 추가
  - doGet?action=getCalendars  → 캘린더 목록
  - doGet?action=getCalendarEvents  → 슬롯 조회
  - doPost {action:'createCalendarEvent'}  → 예약 생성
코드: apps-script/Code.gs
⚠️ GAS 재배포 필요: GAS 편집기 → 배포 → 배포 관리 → 기존 배포 편집 → 새 버전
```

#### admin RTE(리치텍스트) 헬퍼 함수 (admin/index.html 전역)
도구 설명·완료메시지 등 긴 텍스트 필드에 사용. 모든 도구 admin UI에서 재사용.
```javascript
rteGet(id)        // contenteditable div → HTML 추출
rteSet(id, html)  // HTML → contenteditable div에 설정
rteCmd(id, cmd)   // execCommand 실행 (bold/italic/underline 등)
rteLinkCmd(id)    // 링크 삽입
rteInsertVar(id)  // 커서 위치에 {{key}} 변수 삽입 (prompt로 키 입력)
```
현재 적용된 도구 admin 필드: sc-desc, sc-confirm-msg, yt-plc-desc, yt-plc-done-sub, tf-desc, tf-submit-msg, cg-ai-context, py-desc, py-success

#### 도구 블록 시스템
| toolType | URL | 분류 |
|----------|-----|------|
| `form` | `/tools/form/?id={formId}` | 선택형(인스턴스 선택) |
| `booth` | `/tools/booth/` | 선택형 |
| `guide` | `/tools/guide/?id={guideId}` | 선택형 |
| `schedule` | `/tools/schedule/?id={scheduleId}` | 선택형 |
| `payment` | `/tools/payment/?id={configId}` | 선택형 |
| `copy-gen` | `/tools/copy-gen/?id={configId}` | 선택형 |
| `youtube-playlist` | `/tools/youtube-playlist/` | 단일(인스턴스 없음) |

도구 완료 신호: `window.parent.postMessage({ type: 'lmp-tool-complete' }, '*')`
플레이어 수신 후 `autoCheckBlock(blockId)` 호출 → 진행률 저장

---

### 🗂️ 전역 UI 패턴 (Global UI Patterns)

재사용 가능한 UI 컴포넌트. 새 기능에 도움말이나 패널이 필요하면 아래 패턴을 그대로 활용한다.

#### 왼쪽 도움말 패널 (Left Help Panel)

`admin/index.html`에 전역으로 구현되어 있음. 어디서든 한 줄로 호출 가능.

```javascript
openHelpPanel('제목 텍스트', '<p>내용 HTML</p>');
closeHelpPanel();
```

- HTML: `#help-panel`, `#help-panel-backdrop` (전역, body 직하위)
- 트리거 버튼: `?` 텍스트, `prev-btn` 스타일, 해당 기능 헤더 `actions` 영역에 배치

#### 오른쪽 미리보기 패널 (Right Preview Panel)

```css
.preview-side-panel        /* 패널 컨테이너 */
.preview-side-panel-header /* 헤더 (크기조절 버튼 포함) */
```
`setPreviewSize(±30)` 로 크기 조절. 도움말은 왼쪽, 미리보기는 오른쪽.

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

#### 완료 ✅

**핵심 플랫폼**
- admin CMS 패널: 프로젝트 생성·편집, 스테이지 관리, 블록 에디터 (텍스트/이미지/혼합/임베드/도구)
- 블록 에디터: 포맷바, 배경색, 마진, 복제, 이미지 배치 설정(fit/position/height), 오버레이 세로정렬
- p/ 플레이어: 프로젝트 렌더링, 사용자 인증, 스테이지 탐색, 블록 체크 진행률
- 브라우저 뒤로가기/앞으로가기 SPA 히스토리 네비게이션 (admin + p/ 3파일)
- 전역 도움말 패널 (`#help-panel`): `openHelpPanel()` / `closeHelpPanel()`

**인증·사용자**
- 로그인 사용자 인사 문구: `greetingText` + `{{변수명}}` 치환
- '필요 시 로그인' 모드 (`authMode:'lazy'`): 비로그인 둘러보기 + 동작 시점 로그인
- 사이드바 로그아웃 버튼
- 등록 CTA 별도 표시 (`selfRegCtaSeparate`)
- 로그인 트래킹: `lastLoginAt` + `loginCount`

**게시·공개 관리**
- 프로젝트 단위 게시/비공개 (`published`) + 미리보기 토큰 URL
- 스테이지 3단계 게시 상태: `published` / `disabled` / `hidden`
- 관리자 프리뷰 모드 (`?admin=TOKEN`): 비공개·숨김·비활성 스테이지 진입 가능, 빨간 배너 표시
- SNS/카카오 공유 미리보기 (OG 메타태그): 배포 시 자동 주입

**도구 시스템**
- `type:'tool'` 블록: 도구 탭 → 종류 선택 → 인스턴스 선택 → iframe 렌더링
- lmp-tool-complete 신호 → autoCheckBlock → 진행률 자동 저장
- 도구 완료 조건 설정 (`completeTrigger`)
- 도구 블록 전체화면 높이 옵션 (`height:'full'`)
- noResubmit Firestore 기반 중복 방지

**개별 도구**
- 꾸미기 도구 (`tools/booth/`): Canvas 기반 이미지 합성, 배경 선택(무료/업로드), 비율 유지, 메타바, ResizeObserver 기반 캔버스 크기 감지, no-CORS-first 이미지 로딩
- 폼 도구 (`tools/form/`): cms_form_configs 기반, 글자 수 제한(min/max), 응답 관리 인라인 통합, 달력 위젯(single/range/multi), 파일 업로드 썸네일 뷰(72×72), 제출 내역 확인 및 수정 기능, 업로드 카운터 표시
- 계산기·가이드 (`tools/guide/`): 조건부 계산식 엔진
- 일정 잡기 (`tools/schedule/`): Google Calendar 연동 (GAS), 타임존, 슬롯 계산, Firestore 저장
- 결제 (`tools/payment/`): 페이업(PayUp), 서버 검증 (`api/confirm-payup.js`), `paidTiers` 누적
- 문구 생성기 (`tools/copy-gen/`): Claude API (Haiku), 스타일 옵션, 사용 횟수 제한, RTE 변수 지원
- 유튜브 뮤직 재생목록 (`tools/youtube-playlist/`): YouTube API v3 검색, 선택·제출

**admin UI**
- 도구 탭: 폼 목록·편집·응답 관리 / 꾸미기 도구 구성 / 계산기 빌더 / 결제 인스턴스 / 문구생성 설정 / 유튜브 제출 목록
- 테이블 컬럼 드래그 리사이즈 + 열 고정 범위 선택 (사용자·폼응답·도구응답 테이블)
- admin RTE 헬퍼: 도구 설명·완료메시지 필드에 서식 지원 + `{{변수}}` 삽입 버튼
- 도구 플레이어(form, schedule, youtube-playlist, payment)에 `applyVars()` 적용

---

#### 미완료 / 이슈 🔶

- **GAS 재배포 필요** (updateFormRow + bulkAppend + Calendar 액션 코드는 추가됐으나 GAS 편집기에서 "새 버전" 배포 안 됨)
  → script.google.com → 배포 → 배포 관리 → 기존 배포 편집 → 새 버전
- **일정 잡기 도구 end-to-end 테스트**: GAS 재배포 후 실제 캘린더 연동 확인 필요
- **결제 후 권한 분기(잠금 게이트)**: `paidTiers` 데이터는 저장되나 블록/스테이지/프로젝트 잠금 로직 미구현 — 사용 예시 확인 후 단위 결정

#### Firestore 보안 규칙 (이번 세션에서 변경됨)
```
match /cms_form_responses/{document=**} { allow write: if true; allow read: if true; }
```
→ 제출 내역 조회를 위해 read를 `if true`로 변경 (이미 Firebase Console에서 적용 완료)

---

#### 다음 세션 시작점 🔲

- 사용자가 직접 지정할 예정
- PAT: 만료 시 재발급 (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → repo 권한)

---

### ⚖️ 한국 전자상거래 법적 준수 체크리스트 (결제 연동 시)

> 이 섹션은 결제 기능 오픈 전후 법적 리스크를 확인하기 위한 가이드다.
> 사용자가 "결제 법적 준비" 또는 "전자상거래 요건" 등을 물으면 이 내용을 유실·축약 없이 전달한다.

#### 🔴 법적 의무 사항 (없으면 과태료·행정처분 대상)

**1. 통신판매업 신고** *(행정 절차 — 직접 해야 함)*
- 연간 50회 이상 또는 매출 1,200만 원 이상이면 의무 신고
- 관할 시·군·구청에 신고 → 신고번호 발급
- 발급받은 신고번호를 사이트(푸터)에 반드시 표시해야 함 (전자상거래법)

**2. 사업자 정보 상시 노출** *(전자상거래법 제10조)*
- 표시 필수 항목: 상호, 대표자 성명, 사업자등록번호, 통신판매업 신고번호, 사업장 주소, 연락처(이메일 필수·전화번호)
- 위치: 푸터에 항시 노출

**3. 청약철회권 고지** *(전자상거래법 제17조)*
- 디지털 콘텐츠는 수신 즉시 이용 가능할 경우 청약철회 배제 가능
- 단, 그 사실을 **결제 전에 명확히 고지하고 소비자가 동의**해야 배제 효력 발생
- 미고지 시 → 무조건 7일 이내 환불 의무 발생
- 현재: `successMessage` 필드만 있고 결제 전 고지 화면 없음 → 미구현

**4. 개인정보처리방침 게시** *(개인정보보호법 제30조)*
- 필수 기재: 수집 항목, 수집 목적, 보유 기간, 제3자 제공 여부, 파기 절차 및 방법, 개인정보 보호책임자 연락처
- 운영 방법: 별도 페이지로 운영, 푸터에 링크 노출
- 현재: 미구현

**5. 이용약관** *(전자상거래법 제11조)*
- 필수 기재: 서비스 이용 조건, 책임 한계, 분쟁 해결 기준
- 결제 전 약관 동의 절차 필요
- 현재: 미구현

---

#### 🟡 결제 흐름에서 누락된 안전장치

현재 흐름의 문제:
```
현재:  [결제 버튼 클릭] → 페이업 결제창 → 완료
필요:  [결제 버튼 클릭] → 최종 확인(상품/금액/환불조건 명시) → 청약철회 배제 동의 체크 → 페이업 결제창 → 완료 → 영수증 발송
```

| 항목 | 현황 | 필요 이유 |
|------|------|-----------|
| 결제 전 최종 확인 화면 (상품명·금액 명시) | ❌ 미구현 | 전자상거래법: 계약 내용 확인 의무 |
| 디지털 콘텐츠 청약철회 배제 동의 체크박스 | ❌ 미구현 | 미고지 시 무조건 7일 환불 의무 |
| 결제 완료 후 영수증·확인 발송 (이메일/문자) | ❌ 미구현 | 전자상거래법 제8조 거래 확인 의무 |
| 에스크로 또는 대안 안전결제 | ❌ 미구현 | 30만 원 이상 거래 시 의무 (PG사 통해 처리 가능) |
| 환불 처리 기능 (페이업 환불 API) | ❌ 미구현 | 청약철회 의무 이행 수단 |

---

#### 🟢 추가 권고 사항

- **14세 미만 이용 제한** 또는 법정대리인 동의 절차 (개인정보보호법)
- **결제 내역 조회** 페이지 — 사용자가 자신의 결제 기록 직접 확인 가능해야 함
- **1:1 문의 창구** — 이메일이라도 반드시 있어야 함 (없으면 전자상거래법 위반 소지)

---

#### 📌 우선순위 구현 순서

**결제 오픈 전 필수:**
1. 푸터 — 사업자 정보 표시 + 정책 링크
2. 개인정보처리방침 페이지
3. 이용약관 페이지
4. 결제 전 최종 확인 화면 + 청약철회 배제 동의 체크박스
5. 통신판매업 신고 *(행정 절차, 직접 처리)*

**결제 오픈 후 빠르게:**
6. 환불 처리 기능 (토스 환불 API 연동)
7. 결제 완료 알림 (이메일 또는 문자)

> 1~4, 6~7번은 코드로 구현 가능. 5번은 오프라인 행정 절차.

---



위 "🔴 세션 종료 시 자동 수행" 절차를 따른다. 사용자가 명시적으로 종료 의사를 밝혀야 CLAUDE.md를 갱신한다.
