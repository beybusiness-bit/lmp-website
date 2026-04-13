# lmp작업실 홈페이지

> 느리지만 분명히 뭔가를 저지르는 곳 · lazymaxpotential.kr

## 구조

```
/
├── index.html                  홈페이지
├── hidden.html                 준비중 안내 페이지
├── login.html                  로그인 / 회원가입
├── mypage.html                 마이페이지
├── cart.html                   장바구니
├── lazy/
│   ├── info.html               lmp작업실 소개
│   ├── way-to-come.html        찾아오는 길
│   └── lmpeople.html           작업실의 사람들
├── max/
│   ├── monthly-tenency.html    작업실 입주
│   ├── rental.html             공간대여
│   ├── jmgc.html               저스트모닝기지개클럽
│   ├── undone-gallery.html     안 한 거 전시회
│   └── tour.html               [숨김] 작업실 투어 신청
├── potential/
│   ├── events.html             작업실에서 벌어진 일들
│   ├── gmbf.html               게을러서 못 열 뻔한 플리마켓
│   ├── shop.html               상점
│   ├── workwithus.html         작업실과 협업하려면?
│   └── gmbs.html               [숨김] 게을러서 못 열 뻔한 상점
├── assets/
│   ├── css/main.css            디자인 시스템 (모든 스타일)
│   └── js/
│       ├── config.js           사이트 설정 (어드민과 연동)
│       └── main.js             공통 스크립트
└── vercel.json                 Vercel 배포 설정
```

## 기술 스택
- HTML / CSS / Vanilla JS (정적 사이트)
- 호스팅: Vercel (GitHub 연동 자동 배포)
- 폰트: Pretendard (CDN)
- 결제: 토스페이먼츠 (Phase 3.5 예정)
- 인증: Firebase Auth (Phase 6 예정)

## 개발 순서
- Phase 2  ✅ 정적 사이트 껍데기 완성
- Phase 3     GitHub + Vercel + 도메인 연결
- Phase 3.5   결제 시스템 (토스페이먼츠)
- Phase 4     어드민 웹앱
- Phase 5     홈페이지 ↔ 관리자앱 연동
- Phase 6     회원 시스템 (Firebase Auth)
- Phase 6.5   게시판 / 갤러리 / 댓글

## 어드민 연동
- `assets/js/config.js` 파일을 어드민이 GitHub API로 수정 → Vercel 자동 배포
- 페이지 내 `#page-content` 영역이 어드민 블록 에디터의 편집 대상
