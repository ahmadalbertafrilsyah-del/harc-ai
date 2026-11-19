const CACHE_NAME = "harc-ai-shell-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(["/logo.png", "/icon.png", "/offline"]).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return;

  // Fallback halaman offline bila pengguna bernavigasi tanpa jaringan.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedOffline = await caches.match("/offline");
        return cachedOffline || Response.error();
      })
    );
    return;
  }

  if (url.pathname === "/logo.png" || url.pathname === "/icon.png") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const net = fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        });
        return cached || net;
      })
    );
  }
});

// Dukungan Web Push / FCM ketika payload push dikirim ke service worker.
self.addEventListener("push", (event) => {
  let payload = {
    title: "HARC-AI",
    body: "Ada pembaruan baru di portal belajar Anda.",
    url: "/dashboard",
  };
  try {
    if (event.data) {
      const json = event.data.json();
      payload = {
        title: json.title || json.notification?.title || payload.title,
        body: json.body || json.notification?.body || payload.body,
        url: json.url || json.data?.url || payload.url,
      };
    }
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/logo.png",
      badge: "/icon.png",
      data: { url: payload.url },
    })
  );
});

// Buka atau fokuskan aplikasi saat pengguna mengetuk notifikasi di HP.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
