// Cloudflare Worker（Supabaseの代わり）とやり取りするための、ごく薄いクライアント。
// .env の VITE_API_BASE_URL に、デプロイしたWorkerのURLを設定して使う。
// アカウントごとのデータになったため、すべての通信でログインCookieを送る（credentials: "include"）。

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const apiConfigured = !!API_BASE;

export function loginUrl() {
  return `${API_BASE}/auth/login`;
}

export async function apiGetMe() {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export async function apiLogout() {
  await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
}

export async function apiLoad(key) {
  const res = await fetch(`${API_BASE}/api/data/${encodeURIComponent(key)}`, { credentials: "include" });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`load failed: ${key}`);
  const row = await res.json();
  return row ? JSON.parse(row.value) : null;
}

// 全キーをまとめて取得する（初回読み込み・ポーリングでの再取得に使う）
export async function apiLoadAll() {
  const res = await fetch(`${API_BASE}/api/data`, { credentials: "include" });
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
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`save failed: ${key}`);
}

/* ---------------- 共有メンバーライブラリ（コピー用） ---------------- */

export async function apiLoadSharedMembers() {
  const res = await fetch(`${API_BASE}/api/shared-members`, { credentials: "include" });
  if (!res.ok) throw new Error("load shared members failed");
  return res.json();
}

export async function apiPublishSharedMember(member) {
  const res = await fetch(`${API_BASE}/api/shared-members`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member }),
  });
  if (!res.ok) throw new Error("publish shared member failed");
  return res.json();
}

export async function apiDeleteSharedMember(id) {
  const res = await fetch(`${API_BASE}/api/shared-members/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("delete shared member failed");
}
