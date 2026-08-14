// アプリの画面（HTML/JS/CSS）をオフラインでも開けるようにするための簡易サービスワーカー。
// データ（メンバー情報など）のオフライン対応は src/App.jsx 側のキャッシュ機構が担当する。

const CACHE_NAME = "idolposttext-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ネットワークを優先しつつ、成功したレスポンスはキャッシュに保存しておく。
// オフライン時（fetch失敗時）はキャッシュから返す。
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Supabaseなど外部APIへの通信はキャッシュ対象外（アプリの画面表示のみが対象）
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match("/");
          return undefined;
        })
      )
  );
});
