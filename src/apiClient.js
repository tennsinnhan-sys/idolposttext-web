// Cloudflare Worker（Supabaseの代わり）とやり取りするための、ごく薄いクライアント。
// .env の VITE_API_BASE_URL に、デプロイしたWorkerのURLを設定して使う。
//
// ログイン情報はCookieではなく「トークン」を自分のブラウザ内（localStorage）に保存して使う。
// APIとアプリのドメインが別々（workers.dev / pages.dev）だと、Cookie方式はスマホの
// ブラウザ（特にSafari）のプライバシー保護機能でブロックされてしまうため。

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const apiConfigured = !!API_BASE;

const TOKEN_KEY = "idolposttext:sessionToken";

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 保存に失敗しても致命的ではないので静かに無視 */
  }
}
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ログイン直後、Workerからのリダイレクトに付いてくる ?token=... を取り込んで保存する。
// 保存したらURLからは消しておく（アドレスバーやブラウザ履歴にトークンを残さないため）。
export function consumeUrlToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return;
  setToken(token);
  params.delete("token");
  const rest = params.toString();
  window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash);
}

export function loginUrl() {
  return `${API_BASE}/auth/login`;
}

export async function apiGetMe() {
  if (!getToken()) return null;
  const res = await fetch(`${API_BASE}/auth/me`, { headers: { ...authHeaders() } });
  if (!res.ok) { setToken(null); return null; }
  const user = await res.json();
  if (!user) setToken(null);
  return user;
}

export async function apiLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers: { ...authHeaders() } });
  } catch {
    /* ネットワークエラーでも手元のトークンは消す */
  }
  setToken(null);
}

export async function apiLoad(key) {
  const res = await fetch(`${API_BASE}/api/data/${encodeURIComponent(key)}`, { headers: { ...authHeaders() } });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`load failed: ${key}`);
  const row = await res.json();
  return row ? JSON.parse(row.value) : null;
}

// 全キーをまとめて取得する（初回読み込み・ポーリングでの再取得に使う）
export async function apiLoadAll() {
  const res = await fetch(`${API_BASE}/api/data`, { headers: { ...authHeaders() } });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("load all failed");
  const rows = await res.json();
  const map = {};
  for (const row of rows) {
    try {
      map[row.key] = JSON.parse(row.value);
    } catch {
      /* 壊れた値は無視 */
    }
  }
  return map;
}

export async function apiSave(key, value) {
  const res = await fetch(`${API_BASE}/api/data/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`save failed: ${key}`);
}

/* ---------------- 共有メンバーライブラリ（コピー用） ---------------- */

export async function apiLoadSharedMembers() {
  const res = await fetch(`${API_BASE}/api/shared-members`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("load shared members failed");
  return res.json();
}

export async function apiPublishSharedMember(member) {
  const res = await fetch(`${API_BASE}/api/shared-members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ member }),
  });
  if (!res.ok) throw new Error("publish shared member failed");
  return res.json();
}

export async function apiDeleteSharedMember(id) {
  const res = await fetch(`${API_BASE}/api/shared-members/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("delete shared member failed");
}
