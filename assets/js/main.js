// ── 준비중 모드 ──────────────────────────────
const PREVIEW_KEY = 'lmp관리자';
const urlPreview = new URLSearchParams(window.location.search).get('preview');
if (urlPreview === PREVIEW_KEY) localStorage.setItem('lmp_preview', 'true');
const isPreview = localStorage.getItem('lmp_preview') === 'true';

if (!isPreview) {
  document.documentElement.style.overflow = 'hidden';
  const cs = document.createElement('div');
  cs.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#FFF9F3;display:flex;align-items:center;justify-content:center;overflow:hidden;';
  cs.innerHTML = `<img src="/assets/images/coming-soon.jpg" alt="준비중" class="cs-img">`;
  document.body.appendChild(cs);
}
// ─────────────────────────────────────────────
/**
 * lmp작업실 — 공통 스크립트
 * 헤더/푸터 주입, 플로팅 버튼, 모바일 메뉴, 인증 상태
 */

document.addEventListener('DOMContentLoaded', () => {
  applySiteConfig();
  injectHeader();
  injectFooter();
  injectFloatingButtons();
  initMobileMenu();
  initScrollButtons();
  initAuthState();
  markActiveNav();
  checkPageStatus();
});

/* ── config → CSS 변수 적용 ──────────────────────────────── */
function applySiteConfig() {
  if (typeof SITE_CONFIG === 'undefined') return;
  const { colors, typography } = SITE_CONFIG;
  const root = document.documentElement;
  if (colors) {
    root.style.setProperty('--bg-ivory',     colors.bgIvory);
    root.style.setProperty('--bg-pink',      colors.bgPink);
    root.style.setProperty('--accent-green', colors.accentGreen);
    root.style.setProperty('--accent-pink',  colors.accentPink);
    root.style.setProperty('--text',         colors.text);
    root.style.setProperty('--text-muted',   colors.textMuted);
    root.style.setProperty('--footer-bg',    colors.footerBg);
    root.style.setProperty('--footer-text',  colors.footerText);
    root.style.setProperty('--border',       colors.border);
  }
  if (typography) {
    root.style.setProperty('--font-main', typography.fontFamily);
  }
}

/* ── 헤더 주입 ───────────────────────────────────────────── */
function injectHeader() {
  const el = document.getElementById('header-placeholder');
  if (!el) return;
  const cfg = SITE_CONFIG;

  el.outerHTML = `
  <header id="site-header" role="banner">
    <div class="header__inner">
      <a href="/" class="header__logo">${buildLogoHtml(cfg.logo)}</a>
      <nav class="header__nav" aria-label="주요 메뉴">${buildNavHtml(cfg.nav)}</nav>
      <div class="header__actions" id="header-actions">${buildHeaderActionsHtml()}</div>
      <div class="header__mobile">
        <button class="header__hamburger" id="hamburger-btn" aria-label="메뉴 열기">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>
  <div id="menu-overlay"></div>
  <nav id="mobile-menu" aria-label="모바일 메뉴">
    <div class="mobile-menu__header">
      <button class="mobile-menu__close" id="menu-close-btn">✕</button>
    </div>
    ${buildMobileNavHtml(cfg.nav)}
    <div class="mobile-menu__actions" id="mobile-actions">${buildMobileActionsHtml()}</div>
  </nav>`;
}

function buildLogoHtml(logo) {
  if (!logo) return 'lmp작업실';
  if (logo.type === 'image' && logo.imageSrc)
    return `<img src="${logo.imageSrc}" alt="${logo.imageAlt}" style="height:${logo.imageHeight}">`;
  return `<span style="font-family:${logo.fontFamily};font-size:${logo.fontSize};font-weight:${logo.fontWeight};color:${logo.color}">${logo.text}</span>`;
}

function buildNavHtml(navItems) {
  return navItems.map(cat => {
    const items = cat.items.filter(i => i.status === 'active').map(i =>
      `<li class="nav__dropdown-item"><a href="${i.path}.html">${i.label}</a></li>`
    ).join('');
    return `
    <div class="nav__item">
      <button class="nav__top-link">${cat.label}</button>
      <ul class="nav__dropdown">
        <li class="nav__sub-label">${cat.sub}</li>
        ${items}
      </ul>
    </div>`;
  }).join('');
}

function buildHeaderActionsHtml() {
  return `
    <a href="/login.html" class="header__action-btn" id="auth-btn">로그인</a>
    <a href="/cart.html" class="header__action-btn header__cart-btn" aria-label="장바구니">
      🛒<span class="cart-badge" id="cart-badge"></span>
    </a>`;
}

function buildMobileNavHtml(navItems) {
  return navItems.map(cat => {
    const items = cat.items.filter(i => i.status === 'active').map(i =>
      `<li class="mobile-menu__item"><a href="${i.path}.html">${i.label}</a></li>`
    ).join('');
    return `
    <div class="mobile-menu__nav-group">
      <div class="mobile-menu__category">${cat.label} — ${cat.sub}</div>
      <ul>${items}</ul>
    </div>`;
  }).join('');
}

function buildMobileActionsHtml() {
  return `
    <a href="/login.html" class="mobile-menu__action-btn" id="mobile-auth-btn">로그인</a>
    <a href="/cart.html" class="mobile-menu__action-btn">🛒 장바구니</a>`;
}

/* ── 푸터 주입 ───────────────────────────────────────────── */
function injectFooter() {
  const el = document.getElementById('footer-placeholder');
  if (!el) return;
  const { footer, logo } = SITE_CONFIG;
  const { legal, social, links, slogan } = footer;

  el.outerHTML = `
  <footer id="site-footer" role="contentinfo">
    <div class="footer__inner">
      <div class="footer__top">
        <div class="footer__brand">
          <a href="/" class="footer__logo">${buildLogoHtml(logo)}</a>
          <p class="footer__slogan">${slogan}</p>
          <div class="footer__social">
            ${social.instagram ? `<a href="${social.instagram}" class="footer__social-link" target="_blank" rel="noopener" aria-label="인스타그램"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>` : ''}
            ${social.kakao ? `<a href="${social.kakao}" class="footer__social-link" target="_blank" rel="noopener" aria-label="카카오채널"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.483 1.379 4.677 3.5 6.096L4.5 21l4.5-2.5c.97.218 1.972.5 3 .5 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/></svg></a>` : ''}
          </div>
        </div>
        <div class="footer__links">
          ${links.terms   ? `<a href="${links.terms}"   class="footer__link">이용약관</a>` : ''}
          ${links.privacy ? `<a href="${links.privacy}" class="footer__link footer__link--bold">개인정보처리방침</a>` : ''}
        </div>
      </div>
      <div class="footer__bottom">
        <div class="footer__legal">
          <div class="footer__legal-row">
            ${legal.company        ? `<span><strong>상호</strong> ${legal.company}</span>` : ''}
            ${legal.representative ? `<span><strong>대표자</strong> ${legal.representative}</span>` : ''}
            ${legal.address        ? `<span><strong>주소</strong> ${legal.address}</span>` : ''}
          </div>
          <div class="footer__legal-row">
            ${legal.phone ? `<span><strong>전화</strong> ${legal.phone}</span>` : ''}
            ${legal.email ? `<span><strong>이메일</strong> <a href="mailto:${legal.email}">${legal.email}</a></span>` : ''}
          </div>
          <div class="footer__legal-row">
            ${legal.businessNumber  ? `<span><strong>사업자등록번호</strong> ${legal.businessNumber}</span>` : ''}
            ${legal.mailOrderNumber ? `<span><strong>통신판매업신고번호</strong> <a href="${legal.mailOrderUrl}" target="_blank" rel="noopener">${legal.mailOrderNumber}</a></span>` : ''}
          </div>
          <div class="footer__legal-row">
            ${legal.privacyOfficer  ? `<span><strong>개인정보관리책임자</strong> ${legal.privacyOfficer}</span>` : ''}
            ${legal.hostingProvider ? `<span><strong>호스팅제공자</strong> ${legal.hostingProvider}</span>` : ''}
          </div>
          <div class="footer__legal-row" style="margin-top:10px;opacity:0.4;font-size:0.72rem;">
            <span>© ${new Date().getFullYear()} ${SITE_CONFIG.siteName}. All rights reserved.</span>
          </div>
        </div>
      </div>
    </div>
  </footer>`;
}

/* ── 플로팅 버튼 ─────────────────────────────────────────── */
function injectFloatingButtons() {
  const kakaoUrl = SITE_CONFIG?.kakaoChannel?.url || '';
  document.body.insertAdjacentHTML('beforeend', `
  <div class="floating-group floating-group--right">
    <a href="${kakaoUrl}" class="float-btn float-btn--kakao" target="_blank" rel="noopener" aria-label="카카오채널">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#3A1D1D"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.483 1.379 4.677 3.5 6.096L4.5 21l4.5-2.5c.97.218 1.972.5 3 .5 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/></svg>
    </a>
  </div>
  <div class="floating-group floating-group--left" id="scroll-btns">
    <button class="float-btn" id="scroll-top-btn" aria-label="맨 위로">↑</button>
    <button class="float-btn" id="scroll-bottom-btn" aria-label="맨 아래로">↓</button>
  </div>`);
}

/* ── 스크롤 버튼 표시 ────────────────────────────────────── */
function initScrollButtons() {
  const threshold = window.innerHeight * 0.8;
  window.addEventListener('scroll', () => {
    document.getElementById('scroll-btns')?.classList.toggle('visible', window.scrollY > threshold);
  }, { passive: true });

  document.addEventListener('click', e => {
    if (e.target.closest('#scroll-top-btn'))
      window.scrollTo({ top: 0, behavior: 'smooth' });
    if (e.target.closest('#scroll-bottom-btn'))
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
}

/* ── 모바일 메뉴 ─────────────────────────────────────────── */
function initMobileMenu() {
  function closeMenu() {
    document.getElementById('mobile-menu')?.classList.remove('open');
    document.getElementById('menu-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#hamburger-btn')) {
      document.getElementById('mobile-menu')?.classList.add('open');
      document.getElementById('menu-overlay')?.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    if (e.target.closest('#menu-close-btn') || e.target === document.getElementById('menu-overlay'))
      closeMenu();
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
}

/* ── 인증 상태 (Phase 6에서 Firebase Auth로 교체) ─────────── */
function initAuthState() {
  const isLoggedIn = localStorage.getItem('lmp_user') !== null;
  if (isLoggedIn) {
    const set = (id, text, href) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = text; el.href = href; }
    };
    set('auth-btn', '마이페이지', '/mypage.html');
    set('mobile-auth-btn', '마이페이지', '/mypage.html');
  }
}

/* ── 현재 페이지 활성 표시 ──────────────────────────────── */
function markActiveNav() {
  const path = window.location.pathname.replace(/\.html$/, '');
  document.querySelectorAll('.nav__dropdown-item a, .mobile-menu__item a').forEach(link => {
    if (new URL(link.href).pathname.replace(/\.html$/, '') === path) {
      link.style.background = 'var(--accent-green)';
      link.closest('.nav__item')?.classList.add('active');
    }
  });
}

/* ── 숨김 페이지 리다이렉트 ─────────────────────────────── */
function checkPageStatus() {
  const path = window.location.pathname.replace(/\.html$/, '');
  if (SITE_CONFIG?.pages?.[path]?.status === 'hidden')
    window.location.replace('/hidden.html');
}
