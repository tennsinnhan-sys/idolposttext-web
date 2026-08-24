// Cloudflare Worker（Supabaseの代わり）とやり取りするための、ごく薄いクライアント。
// .env の VITE_API_BASE_URL に、デプロイしたWorkerのURLを設定して使う。

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const apiConfigured = !!API_BASE;

export async function apiLoad(key) {
  const res = await fetch(`${API_BASE}/api/data/${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`load failed: ${key}`);
  const row = await res.json();
  return row ? JSON.parse(row.value) : null;
}

// 全キーをまとめて取得する（初回読み込み・ポーリングでの再取得に使う）
export async function apiLoadAll() {
  const res = await fetch(`${API_BASE}/api/data`);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`save failed: ${key}`);
}
