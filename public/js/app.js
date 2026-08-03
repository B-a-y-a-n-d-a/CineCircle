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
  // the current user's initials and let them switch names via the welcome page.
  function wireUserChip() {
    const user = getUser();
    document.querySelectorAll('[data-user-avatar]').forEach((el) => {
      el.textContent = initials(user?.name);
      el.title = user ? `Signed in as ${user.name} — click to switch` : 'Set your name';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontWeight = '700';
      el.addEventListener('click', () => {
        clearUser();
        window.location.href = 'welcome.html';
      });
    });
  }

  window.CineCircle = { api, getUser, setUser, clearUser, requireUser, initials, timeAgo, escapeHtml, wireUserChip };
})();
