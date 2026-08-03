// CineCircle — shared frontend helpers. Included by every page in public/.
(function () {
  const API_BASE = '/api';

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(API_BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('cc_user') || 'null'); }
    catch { return null; }
  }

  function setUser(user) {
    localStorage.setItem('cc_user', JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem('cc_user');
  }

  // Call at the top of any page that requires a logged-in user.
  // Redirects to welcome.html if nobody is set, and returns the user otherwise.
  function requireUser() {
    const user = getUser();
    if (!user) {
      window.location.href = 'welcome.html';
      return null;
    }
    return user;
  }

  // Call at the top of any protected page (before requireUser) to make sure
  // there's still a real Supabase Auth session — not just a cached local profile.
  // Requires supabase-config.js + supabase-client.js to be loaded first.
  async function requireSession() {
    const session = window.CineCircleAuth ? await window.CineCircleAuth.getSession() : null;
    if (!session) {
      clearUser();
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  // Looks up a profile already saved for this auth_id (e.g. on a new device/
  // browser where localStorage is empty). Returns null if none exists yet.
  async function fetchExistingProfile(authId) {
    try {
      return await api(`/users/me?auth_id=${encodeURIComponent(authId)}`);
    } catch {
      return null;
    }
  }

  async function signOut() {
    if (window.CineCircleAuth) await window.CineCircleAuth.signOut();
    clearUser();
    window.location.href = 'login.html';
  }

  function initials(name) {
    return (name || '?').trim().slice(0, 2).toUpperCase();
  }

  function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Wires the user avatar button (top-right, present on every page) to show
  // the current user's initials and open a dropdown with Settings / Log out.
  function wireUserChip() {
    const user = getUser();

    document.querySelectorAll('[data-user-avatar]').forEach((el) => {
      el.textContent = initials(user?.name);
      el.title = user ? `Signed in as ${user.name}` : 'Account';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontWeight = '700';
      el.style.position = 'relative';

      // Avoid double-wiring if wireUserChip is ever called twice on the same page.
      if (el.dataset.ccWired) return;
      el.dataset.ccWired = '1';

      const menu = document.createElement('div');
      menu.setAttribute('data-user-menu', '');
      menu.style.position = 'absolute';
      menu.style.top = 'calc(100% + 10px)';
      menu.style.right = '0';
      menu.style.minWidth = '200px';
      menu.style.background = '#1c1f2c';
      menu.style.border = '1px solid rgba(255,255,255,0.1)';
      menu.style.borderRadius = '12px';
      menu.style.boxShadow = '0 12px 30px rgba(0,0,0,0.5)';
      menu.style.padding = '8px';
      menu.style.display = 'none';
      menu.style.zIndex = '100';
      menu.style.textAlign = 'left';
      menu.innerHTML = `
        <div style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:6px;">
          <div style="font-weight:700;font-size:0.9rem;color:#e0e1f3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(user?.name || 'Guest')}</div>
        </div>
        <button type="button" data-menu-settings style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:none;border:none;color:#e0e1f3;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:0.88rem;font-family:inherit;">
          <span class="material-symbols-outlined" style="font-size:18px;">settings</span> Settings
        </button>
        <button type="button" data-menu-logout style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:none;border:none;color:#ffb4ab;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:0.88rem;font-family:inherit;">
          <span class="material-symbols-outlined" style="font-size:18px;">logout</span> Log out
        </button>`;
      menu.querySelectorAll('button').forEach((b) => {
        b.addEventListener('mouseenter', () => b.style.background = 'rgba(255,255,255,0.06)');
        b.addEventListener('mouseleave', () => b.style.background = 'none');
      });

      // Anchor the menu to a wrapper so it doesn't get clipped by the avatar's own overflow:hidden.
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-flex';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
      wrapper.appendChild(menu);

      const closeMenu = () => { menu.style.display = 'none'; };
      const toggleMenu = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      };

      el.addEventListener('click', toggleMenu);
      menu.querySelector('[data-menu-settings]').addEventListener('click', () => {
        window.location.href = 'settings.html';
      });
      menu.querySelector('[data-menu-logout]').addEventListener('click', () => {
        closeMenu();
        signOut();
      });
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) closeMenu();
      });
    });
  }

  window.CineCircle = { api, getUser, setUser, clearUser, requireUser, requireSession, fetchExistingProfile, signOut, initials, timeAgo, escapeHtml, wireUserChip };
})();
