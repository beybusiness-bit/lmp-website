## 플리마켓 셀러·방문객 포털 — CLAUDE.md

> 🔴 **[최우선 규칙] 세션 중 push 금지 — 커밋만 쌓고, 세션 마무리 시 push+머지 1회**
> - 세션 중에는 `git commit`만 한다. `git push`는 절대 하지 않는다.
> - 세션 마무리 시: push 1회(feature 브랜치) + PR 머지 1회(main) = Vercel 배포 2회 소모.
> - 세션 전체가 길어져도 배포 소모는 딱 2회. 이것이 최소·최적이다.
> - 사용자가 "라이브로 확인하고 싶어"라고 해도 → 세션 마무리 시점까지 커밋만 쌓는다.

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
3. 승인 후 커밋 + push (세션 마무리 시 처음이자 마지막 push):
   - Remote 세션(☁️): `git add [변경 파일] && git commit -m "..." && git push -u origin <현재 feature 브랜치>`
   - Local 세션(💻): main 직접 push 시도 → 403이면 feature 브랜치로 push 후 4번으로
   - ⚠️ `git add .` / `git add -A` 금지
   - ⚠️ 세션 중 이미 push한 커밋이 있어도 괜찮음 — 마무리 시 남은 커밋 push + PR 머지
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
9. **🧪 테스트 체크리스트 출력** — 이번 세션에서 변경한 기능별로 사용자가 직접 확인해야 할 항목을 번호 목록으로 출력한다. 절대 빠뜨리지 않는다.
   - 새로 추가한 기능: 핵심 동작 + 엣지 케이스(권한 없는 사용자, 빈 데이터 등)
   - 수정한 버그: 버그가 실제로 고쳐졌는지 재현 방법
   - 동기화한 파일: 대표 파일 1개만 테스트해도 충분하면 그렇게 안내
10. **다음 세션 시작 프롬프트 출력** — 아래 템플릿 사용:

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
2. 세션 중에는 **커밋만 쌓기** — push 하지 않음 (push = Preview 배포 1회 소모)
   ```bash
   git add [파일] && git commit -m "..."   # push는 아직 안 함
   ```
3. **세션 마무리 시점에 딱 1번: push → PR 생성 → 머지:**
   ```bash
   git push -u origin claude/...   # 이 시점에 처음 push (Preview 배포 1회)
   ```
   ```
   mcp__github__create_pull_request  (head: claude/..., base: main)
   mcp__github__merge_pull_request   (방금 생성된 PR 번호, method: merge)
   ```
4. 머지 직후 로컬 동기화:
   ```bash
   git fetch origin main && git reset --hard origin/main
   ```
5. Vercel 자동 배포 시작 (~1분)

**🔴 배포 횟수 절약 원칙 — 어떤 상황에서도 예외 없음:**
- **한 세션 = push 1번 + PR 머지 1번** (세션 마무리 시에만)
- 세션 중에는 push도, PR 머지도 하지 않는다. 커밋만 쌓는다.
- 사용자가 "확인해봐", "배포해봐", "라이브로 보고 싶어" 라고 해도 → **"세션 끝에 push+머지할게요"라고 안내**
- 이 규칙을 어기면 중간 push마다 Preview 배포 1회 + 머지마다 Production 배포 1회 추가 소모

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
기존에 이미 생성된 프로젝트 파일들은 **템플릿 수정 시 자동으로 갱신되지 않는다.**

> 🔴 **이 규칙을 어기면 admin 미리보기는 정상으로 보이지만 실제 플레이어에서는 기능이 동작하지 않는 버그가 발생한다. 실제로 이 실수가 반복 발생했다.**

**`p/index.html`을 수정했으면 — 규모·중요도와 무관하게 — 반드시:**
1. 아래 명령으로 현재 존재하는 **모든** 생성 프로젝트 파일 목록을 자동 탐지:
   ```bash
   git ls-files | grep "index.html" | grep -v "^p/\|^admin/\|^tools/\|^gmbf/\|^apps-script"
   ```
   (현재 기준: `block-test-demo/index.html`, `gmbf-poc/index.html`, `gmbf-03/index.html` — 추가될 수 있음)
2. **탐지된 모든 파일에 동일한 수정을 즉시 적용** (파일마다 기능이 다를 수 있으니 패턴 존재 여부 확인 후 적용)
3. 모든 파일을 같은 커밋에 포함
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

### 🔵 배포 전략

세션 중에는 **커밋만** 쌓는다. push·PR 머지는 세션 마무리 시 딱 1번.

| 시점 | 할 것 | Vercel 소모 |
|------|-------|------------|
| 세션 중 | `git commit` (push ❌) | 0회 |
| 세션 마무리 | `git push` | 1회 (Preview) |
| 세션 마무리 | PR 머지 → main | 1회 (Production) |
| **합계** | | **2회/세션** |

#### 세션 마무리 push 후 안내 형식

```
✅ push + PR 머지 완료. Vercel 배포 2회 소모.
오늘 전체 배포 횟수 → https://vercel.com/beybusiness-bit/lmp-website/deployments
Vercel 배포까지 ~1분 소요. Cmd+Shift+R 하드 리프레시 해주세요.
```

---

### ⚠️ Vercel 배포 횟수 제한 (Free 플랜: 하루 100회)

Vercel Free 플랜은 **하루 배포 100회 제한**이 있다. feature 브랜치 push 1회 + PR 머지 1회 = 최소 2회 소모. 세션 중 PR을 잘게 나누면 금방 소진된다.

#### 예방 원칙 (필수)

- **세션 중에는 커밋만** — push 하지 않음 (push 자체가 Preview 배포 1회 소모)
- **세션 마무리 시 딱 1번만**: push(1회) + PR 머지(1회) = 세션당 총 2회
- 한 세션 = 커밋 여러 개 + **push 1번 + PR 1개** 원칙

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
  options: [{label, price}]          ← 선택 옵션 (price 없으면 기본 amount 사용)
  questions: [{text, required, multiline}]  ← 주관식 질문
  qtyEnabled: boolean                ← 수량 선택 활성화 여부
  qtyMin: number                     ← 1회 최소 구매 수량
  qtyMax: number                     ← 1회 최대 구매 수량
  qtyPerUser: number                 ← 사용자당 누적 최대 구매 수량 (0=무제한)
  createdAt, updatedAt

cms_payment_records/{paymentKey}
  ...기존 필드...
  selectedOption: {label, price}     ← 선택된 옵션
  questionAnswers: [{question, answer}]  ← 주관식 질문 응답
  qty: number                        ← 구매 수량

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
- 블록 에디터: 이미지 열너비 % 입력 (슬라이더 + 숫자 직접 입력)
- 테이블 열 설정(숨기기·고정) Firestore 영구 저장 (`adminColPrefs` 필드)

**플레이어 UX**
- 이미지 클릭 시 라이트박스 확대 — 블록 이미지, 혼합 블록 이미지, RTE 텍스트 내 이미지 모두 지원
- 블록별 지연 로그인 요구 설정 (`requireAuth` 토글) — on 시 비로그인 사용자에게 🔒 잠금 표시
- 지연 로그인 기준: 도구 블록 자동잠금 폐지 → 전 블록 타입에 `requireAuth` opt-in 방식으로 통일

**방명록 도구 (`tools/guestbook/`)**
- 익명 닉네임 단어 입력 → 콤마 구분 textarea (한 번에 여러 개 입력)
- 위젯 타입으로 방명록 추가 — 카드 슬라이더(작성자·텍스트·날짜, 승인된 항목만 표시)

**사이트 설정 탭 (`admin/index.html`)**
- `cms_admin_settings/site` Firestore 문서로 전역 푸터 설정 저장
- 푸터 로고, 사업자 정보, Instagram URL, 저작권, 개인정보처리방침(RTE), 이용약관(RTE) 설정 가능
- `switchTab('site')` 호출 시 `showProjView('list')` 먼저 호출 → proj-edit-view 오버레이 닫힘
- `loadSiteSettings()` 에러 시 화면에 메시지 표시 + 재시도 가능 (`_siteLoaded` 플래그 위치 수정)

**결제 도구 고도화**
- 결제 전 최종 확인 화면: 상품명·금액 표시 + 청약철회 불가 동의 체크박스 (전자상거래법 제17조)
- 결제 화면에서 상품명 중복 제거 (제목만 표시, 상품명은 영수증·확인 화면에서만)
- admin 결제 탭 내부 분리: "결제 상품" | "결제 설정" 탭 (가맹점 ID는 "결제 설정"으로 이동)
- 결제 도구가 `cms_admin_settings/site`에서 문의 이메일 자동 로드 (`window._siteEmail`)
- 선택 옵션: 옵션마다 다른 금액 설정, 옵션 없으면 기본 금액 사용
- 주관식 질문: 필수/선택, 단답형/장문형 설정 가능
- 구매 수량: 관리자가 1회 최소·최대 + 사용자당 누적 최대 설정, Firestore `FieldValue.increment`로 수량 추적
- 결제 흐름: 메인 → 옵션 선택 → 질문 답변 → 최종 확인 → 결제, sessionStorage로 리다이렉트 후 복원

**사이트 설정 / 푸터**
- SNS 다중 입력: Simple Icons CDN 기반 아이콘 선택 + 사용자 정의 이미지 업로드
- 개인정보처리방침·이용약관: 베이비즈니스 정보 기반 한국어 템플릿 "기본 내용 채우기" 버튼 추가
- 플레이어 푸터 중앙 정렬 (p/, block-test-demo/, gmbf-poc/ 동기화)

---

#### 미완료 / 이슈 🔶

- **사이트 설정 탭 원인 미확정**: 구조·CSS·JS 모두 정상이나 일부 환경에서 여전히 빈칸 보고. 에러 메시지 표시 기능 추가됨 — 다음 세션에서 에러 내용 확인 후 원인 파악 필요
- **GAS 재배포 필요** (updateFormRow + bulkAppend + Calendar 액션 코드는 추가됐으나 GAS 편집기에서 "새 버전" 배포 안 됨)
  → script.google.com → 배포 → 배포 관리 → 기존 배포 편집 → 새 버전
- **일정 잡기 도구 end-to-end 테스트**: GAS 재배포 후 실제 캘린더 연동 확인 필요
- **환불 처리 기능**: 페이업 환불 API 연동 미구현 — 현재 수동 처리 (페이업 대시보드에서 직접)

---

#### 🔴 다음 세션 처리 목록 (버그 · 미구현 · 요청 — 축약/유실 금지)

> 이 목록은 세션 종료 시 사용자가 전달한 내용 그대로를 기록한 것이다. 다음 세션 시작 시 이 목록을 그대로 인용해 처리 계획을 세운다.

~~**🐛 버그 1: 도구 admin 텍스트 편집기 줄바꿈 미표시**~~ ✅ 완료 (이전 세션)

~~**🐛 버그 2: 유튜브 재생목록 '곡 더 추가하기' 클릭 시 프로젝트 프레임 사라짐**~~ ✅ 완료
- `resetForMore()` 함수로 URL 이동 없이 도구 내부 상태 초기화 방식으로 이미 구현됨

~~**🐛 버그 3: 사이드바 활동 내역에 유튜브 재생목록 곡 제출 내역 누락**~~ ✅ 완료
- `loadMyActivity()`에서 `cms_youtube_submissions/{projectId}/songs` 이미 조회하도록 구현됨

~~**🐛 버그 4: 스테이지 제목 정렬(좌/중/우) 플레이어 미적용**~~ ✅ 완료 (이전 세션)

~~**🔲 미구현 기능: 유튜브 재생목록 — 로그인 사용자의 기제출 음악 내역 표시**~~ ✅ 완료 (이전 세션)

~~**📝 요청 1: 도구 admin 편집 페이지 텍스트 편집기 — 볼드 외 버튼 미동작**~~ ✅ 완료 (이번 세션)
- 원인: mini-rte 편집기에 `onmouseup`/`onkeyup` 핸들러 없어 `savedRange` 미갱신 → selection 복원 실패 → `document.execCommand` 동작 안 함
- 수정: admin/index.html 13개 mini-rte div에 `onmouseup="saveRange(this)" onkeyup="saveRange(this)"` 추가

~~**❓ 질문/요청 2: 반응형 레이아웃 전략 및 CTA 버튼 잘림 방지**~~ ✅ 완료 (이전 세션)

**🔧 미해결: admin 결제 관리 탭 일부 컬럼 미표시**
- 위치: admin → 도구 탭 → 결제 → "결제 관리" 탭
- 전체 결제 내역 테이블은 표시됨 ✓
- 결제수단(`cardName`)과 승인시각(`authDatetime`), 주문번호 컬럼 값이 표시 안 됨
- 원인 추정: `pyLoadAllRecords()` 함수에서 Firestore 문서 필드명 불일치 (읽어오는 필드명이 실제 저장된 필드명과 다를 가능성)
- 다음 세션에서 `pyLoadAllRecords` 함수 내 필드 매핑 전수 확인 필요

#### Firestore 보안 규칙 (적용 완료)
```
match /cms_form_responses/{document=**} { allow write: if true; allow read: if true; }
match /cms_payment_records/{doc} { allow read: if true; }
```
→ `cms_payment_records` read 허용: 사이드바 "내 정보" 결제 내역 조회 + payment 도구 내역 조회에 필요 (Firebase Console에서 적용 완료)

---

#### 다음 세션 시작점 🔲

**다음 세션: 미해결 항목 처리**

**🟡 미해결:**
1. admin 결제 관리 탭 — 결제수단·승인시각·주문번호 컬럼 값 미표시 (`pyLoadAllRecords` 필드명 불일치 추정)

**미완료 항목:**
- **GAS 재배포 필요**: updateFormRow + bulkAppend + Calendar 액션 코드는 추가됐으나 GAS 편집기에서 "새 버전" 배포 안 됨 → script.google.com → 배포 → 배포 관리 → 기존 배포 편집 → 새 버전
- **환불 처리 기능**: 페이업 환불 API 연동 미구현 — 현재 수동 처리 (페이업 대시보드에서 직접)
- **꾸미기 도구 테스트 필요**: 이번 세션 5가지 개선 후 실기기 검증 필요 (아래 테스트 체크리스트 참조)

**기타:**
- PAT: 만료 시 재발급 (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → repo 권한)

#### 이번 세션 완료 항목
- **결제 기록 미표시 버그 수정** ✅: `selectedOption.stockRemaining: undefined` → Firestore 저장 실패 버그. `recordPayment()`에서 저장 시 label/price/tier 3필드만 포함하는 안전한 객체로 변환. 모바일·데스크탑 팝업 결제 모두 동일 코드 경로 → 두 케이스 모두 수정 (tools/payment/index.html)
- **admin RTE 도구 편집기 버튼 수정** ✅: mini-rte contenteditable 13개에 `onmouseup="saveRange(this)" onkeyup="saveRange(this)"` 추가. 텍스트 선택 즉시 savedRange 갱신 → 팝업 기반 포맷 버튼(색상/크기/정렬 등) 정상 동작. 볼드만 되던 문제 해결 (admin/index.html)
- **꾸미기 도구 5가지 개선** ✅ (tools/booth/index.html + admin/index.html):
  - fixedSize를 출력 1080px 기준으로 해석 (`fixedSize * canvasW / EXPORT_W`), `_exportFixedW` 보존
  - 실제 크기(cm) 표시 기능 제거 (currentRefPx/pxToCm/refreshSizeCm 완전 제거)
  - 하단 패널 → position:fixed 플로팅 (.open 클래스 토글), 캔버스 크기가 패널에 영향받지 않음
  - 캔버스 리사이즈 시 아이템 위치·크기 자동 보정 (resizeCanvases에 rescale 로직 추가)
  - 완성 버튼 정리: 저장하기 1개만 유지 (saveAndDownload = download + Firebase 갤러리), 공유 제거
  - admin: refPx 입력 필드 제거, fixedSize 레이블 "출력 1080px 기준" 명시, 배경 "권장 크기: 1080×1350px" 힌트 추가
- **플레이어 ↑버튼(return-btn) 제거** ✅: `#return-btn` / `#return-greeting` 요소 제거, showReturnBtn/hideReturnBtn 빈함수 교체 (p/ + 3파일 동기화)
- **지연로그인 등록 CTA 숨김** ✅: `_refreshRegCta()` 함수 추가 — on-demand + selfRegCtaSeparate 조합에서 로그인 사용자에게 등록 CTA 숨김, 로그인 성공 직후 즉시 적용 (4파일 동기화)
- **CTA 클릭 on-demand 동작 수정** ✅: `onCtaClick`에서 on-demand 모드 `openPrep()` → `reopenPrep()` (4파일 동기화)
- **결제 도구 iframe→top 이동 수정** ✅: `retryPayment()` `window.top.location.href` + `URL_PROJECT_ID` fallback
- **결제 도구 데스크탑 팝업 창 방식** ✅: 데스크탑+iframe 환경에서 `window.open('?popup=1')` 새 창으로 PayUp 결제, `lmp-payment-result` postMessage로 결과 전달
- **admin 결제 관리 탭 추가** ✅: 결제 섹션에 "결제 관리" 3번째 서브탭 — 인스턴스 무관 전체 결제 내역 테이블 (`pyLoadAllRecords`)
- **admin 결제 내역 필드명 버그 수정** ✅: `pyViewRecords()` `r.approvedAt` → `r.authDatetime`, `r.method` → `r.cardName`
- **admin RTE 포맷바 2차 수정** ✅: `epd()` pointerdown 시점에 `_fmtCtxRange` 캡처 (click보다 먼저) → Aa/정렬/색상/이미지/링크 모두 동작. `focusEd()` `{preventScroll:true}` 추가. insertHr/applyFmtLink/removeFmtLink `focusEd(ctx)` 통일 (admin/index.html)
- **admin 포맷바 Aa/정렬/색상 수정** ✅: `_fmtCtxRange` 변수로 버튼 클릭 시점 selection 명시 캡처 → mini-rte 팝업 열려도 selection 유지 (admin/index.html)
- **위젯 카드 테두리 설정** ✅: admin 위젯 탭에 테두리 굵기(px)·테두리 색 입력 추가, `WIDGET.borderWidth`/`borderColor` Firestore 필드, 플레이어 4파일 동기화
- **결제 취소 확인 버튼 수정** ✅: `window.confirm` 인터셉트 추가 → PayUp 취소 확인창에서 OK 클릭 시 UI 리셋 (이전엔 아무 반응 없음)
- **결제 모바일 빈화면 개선** ✅: `/api/confirm-payup` 302 redirect → HTML+JS redirect로 교체 → "결제 처리 중…" 텍스트 표시 후 이동 (api/confirm-payup.js)
- iOS 자동 포커스 제거, 방명록 위젯 배경이미지 수정, 등록하기 모달 버그 수정 (이전 세션)
- 홈 블록 기능 추가 (이전 세션)
- **결제 모바일 빈화면 수정** ✅: 성공/실패 결과 페이지 lmp-context 대기 1500ms→200ms 단축 (tools/payment/index.html)
- **결제 성공 후 3초 자동이동 제거** ✅: 사용자가 직접 뒤로가기 또는 이동하도록 변경
- **PayUp 데스크탑 SDK 오류 처리** ✅: `window.onerror`로 payup_standard 스크립트 오류 인터셉트, 8초 타임아웃, PC 환경 안내 메시지
- **사이드바 결제 내역 클릭 네비게이션** ✅: 결제 도구가 있는 스테이지로 이동 (`_navToPaymentStage()` + `_findBlockByToolConfig()`)
- **사이드바 결제 내역 표시 개선** ✅: 상품명 크게(15px/800weight) + 금액 작게(13px/600weight 회색) — 이전 역순 수정
- **텍스트 편집기 드래그 선택 후 볼드 버그 수정** ✅: `onblur="saveRange(this)"` 5개 contenteditable에서 제거 → 드래그 선택 유지
- **텍스트 편집기 폰트 크기 숫자 미업데이트 버그 수정** ✅: `document.activeElement!==inp` 조건 제거
- **스테이지 순서/필드 유실 버그 수정** ✅: `_buildUpdatedStages()` 헬퍼로 `{...s, order:i}` 스프레드 저장, `homeItemOrder` 동기화 추가
- **블록 authMode 5단계 접근 제한 구현** ✅: none/lock/restrict/hide/replace 5모드, arep- 대체 블록 미니 에디터, `requireAuth:true` 하위 호환 (admin + 4파일 동기화)
- **사이드바 전면 리뉴얼** ✅: 나의 활동/나의 구매 2탭, 비로그인 입장하기 버튼 (4파일 동기화)
- **admin 편집 상단바 프로젝트 이름 표시** ✅
- **사이드바 피드백 수정** ✅: 버튼 radius 0·검정색, 활동 글씨 크기·스테이지 제목·클릭 네비게이션, 결제 orderBy 제거
- **재고 잔량 표시 버그 수정** ✅: `stockRemaining ?? stockTotal` fallback (표시·품절판단·재고차감 모두)
- **블록 완전 숨기기 옵션** ✅: admin `tierLockMode: 'cover'|'hide'` 라디오, player renderGuideScroll/Slide 필터링 (4파일)
- **PayUp 결제창 오픈** ✅: SDK 컨테이너 ID `payup_layer`/`bg_layer` 교체 — 오류코드 8002(merchantId)까지 도달
- **admin 폼 필드 모달 버그 수정** ✅: closeFmtPopup() + body.appendChild(modal) 로 z-index DOM 순서 충돌 해결
- **결제 내역 Firestore 인덱스 오류 수정** ✅: orderBy 제거 → 클라이언트 정렬 (tools/payment/index.html)
- **결제 실패 UX 개선** ✅: 실패 화면에 "↩ 처음으로 돌아가기" 버튼 추가 (tools/payment/index.html)
- **결제 게이트 다중 tier 지원** ✅: `requiredTier` 쉼표 구분 파싱 (4파일 동기화), gmbf-03 `_isTierLocked` 누락 추가
- **블록 티어 잠금 '대체 블록' 기능** ✅: admin 4탭 미니 블록 에디터(텍스트/이미지/혼합/임베드) + `_repBlockHtml()` 헬퍼 함수 (4파일 동기화)
- **비로그인 블록 체크 허용** ✅: `toggleBlockCheck()` 로그인 체크 제거 (4파일 동기화)
- **도구 링크 복사 버튼 전체 적용** ✅: `copyToolUrl()` 함수 9개 도구 지원, 결제/방명록/계산기/꾸미기/유튜브 목록에 🔗 버튼 추가
- **PayUp 결제 흐름 동기 form.submit() 방식으로 개선** ✅: `payupPaymentSubmit()` → 동기 `form.submit()`, 타임아웃 60초, 취소 후 재시도 복원. 모바일 사파리 결제 성공 확인
- **메인화면 상·하단 여백 축소** ✅: `#main-content` padding 80px→40px(상단), 100px→40px(하단) — 4파일 동기화. 스테이지 카드 목록 여백은 원래대로 유지
- **스테이지 제목 정렬** ✅: admin ←/↔/→ 버튼, `titleAlign` 필드, 플레이어 4곳(분리형/병합형 × 이미지/텍스트) 적용
- **임베드 블록 "연결 거부" 수정** ✅: `_toRelEmbed()` 헬퍼로 `lazymaxpotential.kr/tools/...` 절대 URL → 상대 경로 자동 변환 (4파일)
- **임베드 블록 전체화면 옵션** ✅: 높이 UI를 자동/전체화면/직접입력 3버튼으로 교체. `embedHeight:'full'` → `g-tool-full-wrap` 100vh 전체화면 (admin + 4파일)

#### Firestore 스키마 추가 (누적)
```
cms_payment_configs/{configId}
  stockEnabled: boolean
  stockTotal: number
  stockRemaining: number     ← 결제 후 트랜잭션 차감; null이면 stockTotal로 fallback
  stockDisplayEnabled: boolean
  stockDisplayThreshold: number
  options[].imageUrl: string

cms_projects/{projectId}
  homeBlocks: Block[]
  homeItemOrder: [{type:'stage'|'homeBlock', id:string}]

stage_content/{stageId}/blocks[*]
  tierLockMode: 'cover'|'hide'|'replace'  ← requiredTier 있을 때만 유효
  tierReplaceBlock: {type, textContent, imageUrl, imageFit, imageHeight, imagePosition, mixedLayout, imageOrder, embedUrl, embedHeight, bgColor}  ← replace 모드, 4가지 블록 타입 지원
  authMode: 'none'|'lock'|'restrict'|'hide'|'replace'  ← 비로그인 접근 제한 (지연 로그인 프로젝트에서만 동작)
  authReplaceBlock: {type, textContent, imageUrl, imageFit, imageHeight, imagePosition, mixedLayout, imageOrder, embedUrl, embedHeight, bgColor}  ← authMode:'replace'일 때 표시할 대체 블록
```

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

**3. 청약철회권 고지** *(전자상거래법 제17조)* ✅
- 디지털 콘텐츠는 수신 즉시 이용 가능할 경우 청약철회 배제 가능
- 단, 그 사실을 **결제 전에 명확히 고지하고 소비자가 동의**해야 배제 효력 발생
- **현재: 구현 완료** — 결제 전 최종 확인 화면 + 청약철회 배제 동의 체크박스

**4. 개인정보처리방침 게시** *(개인정보보호법 제30조)* ✅
- 필수 기재: 수집 항목, 수집 목적, 보유 기간, 제3자 제공 여부, 파기 절차 및 방법, 개인정보 보호책임자 연락처
- 운영 방법: 별도 페이지로 운영, 푸터에 링크 노출
- **현재: 구현 완료** — admin 사이트 설정 탭에 템플릿 입력됨. ⚠️ [이메일 입력] 플레이스홀더 실제 이메일로 교체 필요

**5. 이용약관** *(전자상거래법 제11조)* ✅
- 필수 기재: 서비스 이용 조건, 책임 한계, 분쟁 해결 기준
- 결제 전 약관 동의 절차 필요
- **현재: 구현 완료** — admin 사이트 설정 탭에 템플릿 입력됨. ⚠️ [이메일 입력] 플레이스홀더 실제 이메일로 교체 필요

---

#### 🟡 결제 흐름에서 누락된 안전장치

현재 흐름의 문제:
```
현재:  [결제 버튼 클릭] → 페이업 결제창 → 완료
필요:  [결제 버튼 클릭] → 최종 확인(상품/금액/환불조건 명시) → 청약철회 배제 동의 체크 → 페이업 결제창 → 완료 → 영수증 발송
```

| 항목 | 현황 | 필요 이유 |
|------|------|-----------|
| 결제 전 최종 확인 화면 (상품명·금액 명시) | ✅ 완료 | 전자상거래법: 계약 내용 확인 의무 |
| 디지털 콘텐츠 청약철회 배제 동의 체크박스 | ✅ 완료 | 미고지 시 무조건 7일 환불 의무 |
| 결제 완료 후 영수증·확인 발송 (이메일/문자) | ❌ 미구현 | 전자상거래법 제8조 거래 확인 의무 |
| 에스크로 또는 대안 안전결제 | ❌ (PG사 위임) | 30만 원 이상 거래 시 의무 — 페이업이 PG사로서 처리 |
| 환불 처리 기능 (페이업 환불 API) | ❌ 미구현 | 청약철회 의무 이행 수단 |

---

#### 🟢 추가 권고 사항

- **14세 미만 이용 제한** 또는 법정대리인 동의 절차 (개인정보보호법)
- **결제 내역 조회** 페이지 — 사용자가 자신의 결제 기록 직접 확인 가능해야 함
- **1:1 문의 창구** — 이메일이라도 반드시 있어야 함 (없으면 전자상거래법 위반 소지)

---

#### 📌 우선순위 구현 순서

**결제 오픈 전 필수:**
1. ✅ 푸터 — 사업자 정보 표시 + 정책 링크
2. ✅ 개인정보처리방침 — admin에 템플릿 입력됨 (⚠️ 이메일 교체 필요)
3. ✅ 이용약관 — admin에 템플릿 입력됨 (⚠️ 이메일 교체 필요)
4. ✅ 결제 전 최종 확인 화면 + 청약철회 배제 동의 체크박스
5. ✅ 통신판매업 신고 — 신고번호 푸터 표시 완료

**결제 오픈 후 빠르게:**
6. 🔲 환불 처리 기능 (페이업 환불 API → admin 환불 버튼) — 현재 수동 처리
7. ~~결제 완료 알림~~ — 결제 완료 화면 + 내 정보 내역 조회로 대체 결정 (법적 문제 없음)
8. ✅ 결제 내역 조회 — 사이드바 "내 정보" 패널 구현 완료
9. ✅ 결제 후 권한 분기 — `_isTierLocked()` 블록 잠금 구현 완료

> 1~5, 8~9번 완료. 6번(환불)은 현재 수동 처리 중.

---



위 "🔴 세션 종료 시 자동 수행" 절차를 따른다. 사용자가 명시적으로 종료 의사를 밝혀야 CLAUDE.md를 갱신한다.
