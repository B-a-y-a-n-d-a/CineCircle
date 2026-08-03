// CineCircle — thin wrapper around Supabase Auth for the browser.
// Depends on supabase-config.js (loaded first) and the supabase-js CDN script (loaded first).
(function () {
  const { url, anonKey } = window.SUPABASE_CONFIG || {};
  if (!url || !anonKey || anonKey.startsWith('PASTE_')) {
    console.error('⚠️ Supabase is not configured yet — edit public/js/supabase-config.js with your anon/publishable key.');
  }

  const client = window.supabase.createClient(url, anonKey);

  async function signUpWithPassword(email, password) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signInWithPassword(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signInWithGoogle() {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/welcome.html' },
    });
    if (error) throw error;
  }

  async function signOut() {
    await client.auth.signOut();
  }

  async function getSession() {
    const { data } = await client.auth.getSession();
    return data.session;
  }

  async function getAccessToken() {
    const session = await getSession();
    return session?.access_token || null;
  }

  // Sends a confirmation link to the new address; the change only takes
  // effect once the person clicks it (Supabase default security behaviour).
  async function updateEmail(newEmail) {
    const { data, error } = await client.auth.updateUser({ email: newEmail });
    if (error) throw error;
    return data;
  }

  async function updatePassword(newPassword) {
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  }

  window.CineCircleAuth = {
    client, signUpWithPassword, signInWithPassword, signInWithGoogle, signOut, getSession, getAccessToken,
    updateEmail, updatePassword,
  };
})();
