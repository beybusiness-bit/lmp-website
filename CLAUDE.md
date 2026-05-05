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
    id, type ('text'|'image'|'mixed'|'embed'|'form'), order,
    textContent, imageUrl, mixedLayout, embedUrl, embedHeight,
    bgColor, marginV, marginH, linkUrl,
    formId,        ← 폼 블록 전용
    formTitle,     ← 폼 블록 제목 (시트명에도 사용: "{formTitle}의 응답")
    checkable,     ← 사용자 체크 가능 여부 (boolean)
    sheetId        ← 연결된 Google Sheet ID (폼 응답 저장용)
  }]

cms_users_{projectId}/{userId}
  (프로젝트별 authFields에 따라 자유 구조)
  stageProgress: {stageId: [blockId, blockId, ...]}  ← 체크된 블록 ID 목록

cms_form_configs/{formId}
  fields: [{id, label, type ('text'|'textarea'|'number'|'select'|'file'),
            required, options (선택형 전용), order}]
  submitMsg: string  ← 제출 완료 메시지

cms_form_responses/{formId}/responses/{responseId}
  submittedAt, userId (인증 시), ...fieldValues

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

### 개발 현황

**완료 ✅**
- admin CMS 패널: 프로젝트 생성·편집, 스테이지 관리, 블록 에디터 (텍스트/이미지/혼합/임베드)
- 블록 에디터: 포맷바(크기·정렬·컬러 드롭다운), 배경색, 마진, 복제
- 미리보기: transform:scale() 줌, 실시간 반영
- p/ 플레이어: 프로젝트 렌더링, 사용자 인증, 스테이지 탐색
- admin-link 우하단 스타일 (gmbf/po-c)
- 블록 기능 테스트 더미데이터 시드
- Apps Script 배포 완료 (GAS_URL 등록)
- **CTA 아이콘 크기 조정** (admin에서 24~200px 슬라이더, CSS var(--cta-icon-size))
- **폼 블록 빌더** (관리자)
  - 항목 추가: 단문/장문/숫자/파일/선택, 필수여부, 순서
  - 폼 제목 필드 (시트명 `{formTitle}의 응답`에 사용)
  - 체크 가능(checkable) 토글 — 사용자 체크 여부 추적용
- **폼 렌더링 + 제출** (플레이어)
  - 숫자 필드: 비숫자 입력 차단
  - 제출 → Firestore(`cms_form_responses`) + Google Sheets(POST) 저장
  - `submitForm` GAS 호출: GET → POST로 수정 완료
- **응답 관리 모달** (관리자)
  - 응답 목록 보기 + CSV 다운로드
  - Google Sheet 연결/생성 (기존 응답 백필 옵션)
- **블록 체크 진행률 시스템** (플레이어)
  - 인증 사용자: 블록별 체크/해제 → Firestore `stageProgress` 저장
  - 스테이지 카드: `trackProgress: true`일 때만 진행률 바(%) + 상태 표시
  - `checkableCount` 비정규화로 stage_content 전체 로드 없이 진행률 계산
- **테스트 더미데이터**: block-test-demo 프로젝트 (8 스테이지, 다양한 trackProgress/checkable 조합)

**미확인/이슈 🔶**
- GAS `bulkAppend` 코드: `apps-script/Code.gs`에 추가됐으나 **GAS 편집기에서 재배포 필요**
  → 재배포 안 하면 시트 생성 시 "Failed to fetch" 또는 기존 응답 백필 실패
  → 방법: script.google.com → 배포 → 배포 관리 → 기존 배포 편집 → 새 버전

**진행 예정 🔲**
- GAS 재배포 확인 후 시트 생성 + 백필 기능 end-to-end 테스트
- 블록 체크 진행률 시스템 end-to-end 테스트 (실제 사용자 로그인 후)
- 폼 블록: 파일 업로드 타입 구현 (현재 미구현)
- 폼 블록: 제출 완료 후 화면(submitMsg) 커스터마이즈

---

### ⚠️ 세션 종료 규칙 요약

위 "🔴 세션 종료 시 자동 수행" 절차를 따른다. 사용자가 명시적으로 종료 의사를 밝혀야 CLAUDE.md를 갱신한다.
