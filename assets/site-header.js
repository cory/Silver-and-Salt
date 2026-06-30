/* ═══════════════════════════════════════════════════════════════
   <site-header> — single source of truth for the site header
   (logo + auth-aware actions + tab rail). Edit this file to update
   the header everywhere it appears.
   ═══════════════════════════════════════════════════════════════ */

const AUTH_CACHE_KEY = 'silverSalt.authChrome.v1';
const CLERK_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6.22.0/dist/clerk.browser.js';
const CLERK_UI_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/@clerk/ui@1.23.0/dist/ui.browser.js';

const SECTIONS = {
  about: {
    label: 'About',
    pages: [
      { label: 'Our Story', href: 'index.html#story', homeTab: 'story' },
      { label: 'Community Commitments', href: 'index.html#about', homeTab: 'about' },
      { label: 'Regenerative Capital', href: 'manifesto.html' },
      { label: 'FAQs', href: 'faqs.html' },
    ],
  },
  research: {
    label: 'Research',
    pages: [
      { label: 'The Opportunity', href: 'opportunity.html' },
      { label: 'The Networks', href: 'networks.html' },
      { label: 'Utah Funding 2025', href: 'utah-funding-2025.html' },
      { label: 'Utah Capital Landscape', href: 'utah-funding-research.html' },
      { label: 'Accredited Investors', href: 'accredited-women-research.html' },
      { label: 'National Landscape Map', href: 'landscape-map.html' },
      { label: 'References', href: 'source-bible.html' },
      { label: 'Open Research', href: 'open-research.html' },
    ],
  },
  press: {
    label: 'Press',
    pages: [
      { label: 'Press Contact', href: 'https://forms.gle/dN1DJgWZs9X7Z8U8A', external: true },
      { label: 'Brand Assets', href: 'brand-assets.html' },
    ],
  },
};

function escapeHeaderHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function initialsFor(user) {
  const name = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const source = name || user?.primaryEmailAddress?.emailAddress || user?.email || 'Member';
  return source.split(/\s|@/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'M';
}

function readAuthCache() {
  try {
    const raw = window.sessionStorage?.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    return state?.signedIn ? state : null;
  } catch {
    return null;
  }
}

function writeAuthCache(state) {
  try {
    window.sessionStorage?.setItem(AUTH_CACHE_KEY, JSON.stringify({ ...state, checkedAt: Date.now() }));
  } catch {
    // sessionStorage can be unavailable in hardened browser contexts.
  }
}

function clearAuthCache() {
  try {
    window.sessionStorage?.removeItem(AUTH_CACHE_KEY);
  } catch {
    // no-op
  }
}


async function loadPublicConfig() {
  if (!window.__silverSaltConfigPromise) {
    window.__silverSaltConfigPromise = fetch('/api/config/public').then(r => r.json());
  }
  return window.__silverSaltConfigPromise;
}

async function loadScriptOnce(src, markerAttr) {
  const existing = document.querySelector(`script[${markerAttr}="1"]`);
  if (existing?.dataset.loaded === '1') return;
  await new Promise((resolve, reject) => {
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.setAttribute(markerAttr, '1');
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadClerkUi() {
  if (window.__internal_ClerkUICtor) return window.__internal_ClerkUICtor;
  if (!window.__silverSaltClerkUiPromise) {
    window.__silverSaltClerkUiPromise = loadScriptOnce(CLERK_UI_SCRIPT_SRC, 'data-silver-salt-clerk-ui')
      .then(() => {
        if (!window.__internal_ClerkUICtor) throw new Error('Clerk UI did not initialize.');
        return window.__internal_ClerkUICtor;
      });
  }
  return window.__silverSaltClerkUiPromise;
}

async function loadSilverSaltClerk(config) {
  if (!config?.clerkPublishableKey) return null;
  if (window.Clerk?.loaded) return window.Clerk;
  if (window.__silverSaltClerkPromise) return window.__silverSaltClerkPromise;

  window.__silverSaltClerkPromise = (async () => {
    const ClerkUI = await loadClerkUi();
    window.__clerk_publishable_key = config.clerkPublishableKey;
    await loadScriptOnce(CLERK_SCRIPT_SRC, 'data-silver-salt-clerk');
    if (!window.Clerk) throw new Error('Clerk did not initialize.');
    await window.Clerk.load({
      publishableKey: config.clerkPublishableKey,
      clerkUICtor: ClerkUI,
    });
    return window.Clerk;
  })();

  return window.__silverSaltClerkPromise;
}

async function openClerkSignInModal({ redirectUrl = `${window.location.origin}/members` } = {}) {
  const config = await loadPublicConfig();
  const clerk = await loadSilverSaltClerk(config);
  if (!clerk) throw new Error('Member sign-in is not configured yet.');
  if (!clerk.openSignIn) throw new Error('Clerk sign-in is not available.');
  clerk.openSignIn({
    redirectUrl,
    afterSignInUrl: redirectUrl,
    afterSignUpUrl: redirectUrl,
    fallbackRedirectUrl: redirectUrl,
  });
  return clerk;
}

window.SilverSaltAuth = {
  readSnapshot: readAuthCache,
  writeSnapshot: writeAuthCache,
  clearSnapshot: clearAuthCache,
  loadPublicConfig,
  loadClerk: loadSilverSaltClerk,
  openSignInModal: openClerkSignInModal,
};

class SiteHeader extends HTMLElement {
  connectedCallback() {
    const sectionKey = (this.getAttribute('section') || '').toLowerCase();
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const currentFile = location.pathname.split('/').pop() || 'index.html';
    const isHome = currentFile === 'index.html' || currentFile === '';

    const effectiveSection = sectionKey || (isHome ? 'about' : '');
    const section = SECTIONS[effectiveSection] || null;

    let sectionTabHTML = '';
    if (section) {
      const items = section.pages.map(p => {
        const isCurrent = !p.external && !isHome && p.href === currentFile;
        const targetAttr = p.external ? ' target="_blank" rel="noopener"' : '';
        const homeTabAttr = (isHome && p.homeTab) ? ` data-home-tab="${p.homeTab}"` : '';
        return `<a class="section-dd-link${isCurrent ? ' current' : ''}" href="${p.href}"${targetAttr}${homeTabAttr}>${p.label}</a>`;
      }).join('');
      const activeAttr = isHome ? '' : ' active';
      const ariaAttr = isHome ? '' : ' aria-current="page"';
      sectionTabHTML = `
      <div class="nav-tab section-tab${activeAttr}" data-section="${effectiveSection}"${ariaAttr}>
        <span class="section-tab-label">${section.label}</span>
        <div class="section-dropdown" role="menu">${items}</div>
      </div>`;
    }

    this.innerHTML = `
<nav>
  <div class="nav-top">
    <a class="nav-mark" href="index.html" data-home-tab="welcome">
      <div class="split-circle"><div class="sc-left"></div><div class="sc-right"></div><div class="sc-amp">&amp;</div></div>
      <span class="wordmark">Silver <span class="wm-amp">&amp;</span> Salt Capital</span>
    </a>
    <div class="nav-actions nav-auth-guest">
      <a href="/members" class="nav-login" data-member-login="1" data-short-label="Login">Member Login</a>
      <a href="/join.html" target="_blank" rel="noopener" class="nav-apply">Join</a>
    </div>
    <div class="nav-actions nav-auth-user hidden">
      <div class="nav-user-menu">
        <button class="nav-avatar-button" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Open account menu">
          <span class="nav-avatar-initials">M</span>
        </button>
        <div class="nav-avatar-menu hidden" role="menu">
          <div class="nav-avatar-meta"><strong>Signed in</strong><span class="nav-avatar-email"></span></div>
          <a href="/profile" role="menuitem">Profile</a>
          <a href="/members" role="menuitem">Members</a>
          <a href="/admin" class="nav-admin-menu-item hidden" role="menuitem">Admin</a>
          <button type="button" class="nav-sign-out" role="menuitem">Sign out</button>
        </div>
      </div>
    </div>
  </div>
  <div class="nav-rail">
    <div class="nav-tabs">
      <a class="nav-tab" href="index.html#start" data-home-tab="start" data-page="start">Start</a>
      <a class="nav-tab" href="index.html" data-home-tab="welcome" data-page="welcome">Home</a>
      <a class="nav-tab" href="index.html#thesis" data-home-tab="thesis" data-page="thesis">The Thesis</a>
      <a class="nav-tab" href="index.html#how" data-home-tab="how" data-page="how">How It Works</a>${sectionTabHTML}
      <a class="nav-tab nav-member-tab hidden${pathname === '/members' ? ' active' : ''}" href="/members">Members</a>
      <a class="nav-tab nav-admin-tab hidden${pathname === '/admin' ? ' active' : ''}" href="/admin">Admin</a>
    </div>
  </div>
</nav>
`;

    this.bindHomeTabs();
    this.setStaticActiveTab(pathname);
    this.bindAvatarMenu();
    this.bindMemberLogin();
    const cachedAuth = readAuthCache();
    if (cachedAuth?.signedIn) this.showSignedInFromState(cachedAuth);
    this.loadAuthChromeAfterInitialLoad(cachedAuth);
  }

  loadAuthChromeAfterInitialLoad(cachedAuth) {
    const run = () => this.loadAuthChrome(cachedAuth);
    if (document.readyState === 'complete') {
      setTimeout(run, 250);
      return;
    }
    window.addEventListener('load', () => setTimeout(run, 250), { once: true });
  }

  bindHomeTabs() {
    if (typeof window.showPage !== 'function') return;
    this.querySelectorAll('a[data-home-tab]').forEach(a => {
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        window.showPage(a.dataset.homeTab);
      });
    });
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    const id = activePage.id.replace(/^page-/, '');
    const tab = this.querySelector(`.nav-tab[data-page="${id}"]`);
    if (tab) tab.classList.add('active');
    if (id === 'story' || id === 'about') {
      const sectionTab = this.querySelector('.nav-tab.section-tab[data-section="about"]');
      if (sectionTab) {
        sectionTab.classList.add('active');
        const ddLink = sectionTab.querySelector(`.section-dd-link[data-home-tab="${id}"]`);
        if (ddLink) ddLink.classList.add('current');
      }
    }
  }

  setStaticActiveTab(pathname) {
    if (pathname === '/members') this.querySelector('.nav-member-tab')?.classList.add('active');
    if (pathname === '/admin') this.querySelector('.nav-admin-tab')?.classList.add('active');
  }

  bindAvatarMenu() {
    const button = this.querySelector('.nav-avatar-button');
    const menu = this.querySelector('.nav-avatar-menu');
    if (!button || !menu) return;
    button.addEventListener('click', () => {
      const isHidden = menu.classList.toggle('hidden');
      button.setAttribute('aria-expanded', String(!isHidden));
    });
    document.addEventListener('click', (event) => {
      if (this.contains(event.target)) return;
      menu.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      menu.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
    });
  }

  bindMemberLogin() {
    const login = this.querySelector('[data-member-login]');
    if (!login) return;
    login.addEventListener('click', async (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      login.setAttribute('aria-busy', 'true');
      const loader = this.showMemberLoginLoader();
      try {
        await openClerkSignInModal({ redirectUrl: `${window.location.origin}/members` });
        loader.remove();
      } catch (error) {
        loader.remove();
        const message = error?.message || 'Secure sign-in could not be opened.';
        this.showMemberLoginNotice(message, 'error');
        console.error('Member login failed', error);
      } finally {
        login.removeAttribute('aria-busy');
      }
    });
  }

  showMemberLoginLoader(delayMs = 450) {
    let timeout = window.setTimeout(() => {
      document.querySelector('[data-member-login-loading]')?.remove();
      const loader = document.createElement('div');
      loader.setAttribute('data-member-login-loading', '1');
      loader.setAttribute('role', 'status');
      loader.setAttribute('aria-live', 'polite');
      loader.innerHTML = `
        <div class="member-login-loading-backdrop">
          <div class="member-login-loading-card">
            <div class="member-login-spinner" aria-hidden="true"></div>
            <div>Loading sign-in</div>
          </div>
        </div>`;
      document.body.appendChild(loader);
    }, delayMs);
    return {
      remove() {
        window.clearTimeout(timeout);
        timeout = 0;
        document.querySelector('[data-member-login-loading]')?.remove();
      },
    };
  }

  showMemberLoginNotice(message, tone = 'loading') {
    document.querySelector('[data-member-login-notice]')?.remove();
    const notice = document.createElement('div');
    notice.setAttribute('data-member-login-notice', '1');
    notice.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    notice.innerHTML = `
      <div class="member-login-notice-card">
        <div data-member-login-message>${escapeHeaderHtml(message)}</div>
        ${tone === 'error' ? '<div class="member-login-notice-actions"><a href="/members">Open member page</a><button type="button" data-member-login-close>Close</button></div>' : ''}
      </div>`;
    notice.querySelector('[data-member-login-close]')?.addEventListener('click', () => notice.remove());
    document.body.appendChild(notice);
    return notice;
  }

  async loadAuthChrome(cachedAuth = null) {
    try {
      const config = await loadPublicConfig();
      if (!config.clerkPublishableKey && config.localTestAuthEmail) {
        const localState = {
          signedIn: true,
          email: config.localTestAuthEmail,
          admin: true,
          member: { approved: true, status: 'local_test' },
          initials: initialsFor({ email: config.localTestAuthEmail }),
          imageUrl: '',
        };
        writeAuthCache(localState);
        this.showSignedInFromState(localState);
        return;
      }
      const clerk = await loadSilverSaltClerk(config);
      if (!clerk?.user) {
        clearAuthCache();
        this.showSignedOut();
        return;
      }
      const token = clerk.session ? await clerk.session.getToken() : null;
      let authState = { signedIn: true, admin: false, member: { approved: false } };
      if (token) {
        const res = await fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } });
        if (res.ok) authState = await res.json();
      }
      const state = this.stateFromClerk(clerk, authState);
      writeAuthCache(state);
      this.showSignedInFromState(state, clerk);
    } catch {
      if (cachedAuth?.signedIn) return;
      // Public pages keep their logged-out chrome when auth state cannot load.
    }
  }

  stateFromClerk(clerk, authState) {
    const user = clerk?.user;
    const email = authState?.email || user?.primaryEmailAddress?.emailAddress || '';
    return {
      signedIn: true,
      email,
      admin: Boolean(authState?.admin),
      member: authState?.member || { approved: false },
      initials: initialsFor(user || { email }),
      imageUrl: user?.imageUrl || '',
    };
  }

  showSignedOut() {
    this.querySelector('.nav-auth-guest')?.classList.remove('hidden');
    this.querySelector('.nav-auth-user')?.classList.add('hidden');
    this.querySelector('.nav-member-tab')?.classList.add('hidden');
    this.querySelector('.nav-admin-tab')?.classList.add('hidden');
    this.querySelector('.nav-admin-menu-item')?.classList.add('hidden');
    const emailEl = this.querySelector('.nav-avatar-email');
    if (emailEl) emailEl.textContent = '';
  }

  showSignedInFromState(state, clerk = null) {
    this.querySelector('.nav-auth-guest')?.classList.add('hidden');
    this.querySelector('.nav-auth-user')?.classList.remove('hidden');
    this.querySelector('.nav-member-tab')?.classList.remove('hidden');
    this.querySelector('.nav-admin-tab')?.classList.toggle('hidden', !state?.admin);
    this.querySelector('.nav-admin-menu-item')?.classList.toggle('hidden', !state?.admin);

    const avatarButton = this.querySelector('.nav-avatar-button');
    if (avatarButton) {
      avatarButton.innerHTML = state?.imageUrl
        ? `<img class="nav-avatar-img" src="${escapeHeaderHtml(state.imageUrl)}" alt="" />`
        : `<span class="nav-avatar-initials">${escapeHeaderHtml(state?.initials || 'M')}</span>`;
    }
    const emailEl = this.querySelector('.nav-avatar-email');
    if (emailEl) emailEl.textContent = state?.email || '';
    const signOut = this.querySelector('.nav-sign-out');
    if (signOut) {
      signOut.onclick = async () => {
        clearAuthCache();
        try {
          const liveClerk = clerk || (window.Clerk?.loaded ? window.Clerk : await loadSilverSaltClerk(await loadPublicConfig()));
          if (liveClerk?.signOut) {
            liveClerk.signOut(() => { window.location.href = '/'; });
            return;
          }
        } catch {
          // Fall through to the local redirect if Clerk cannot load.
        }
        window.location.href = '/';
      };
    }
  }
}

if (!customElements.get('site-header')) customElements.define('site-header', SiteHeader);
