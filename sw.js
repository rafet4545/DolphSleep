const CACHE = "dolphsleep-v7";
const DOSYALAR = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (r.mode === "navigate") {   // sayfa: önce ağ (güncel kalsın), yoksa önbellek
    e.respondWith(fetch(r).then(c => { const k = c.clone(); caches.open(CACHE).then(x => x.put("./", k)); return c; }).catch(() => caches.match("./")));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(c => { const k = c.clone(); caches.open(CACHE).then(x => x.put(r, k)); return c; })));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => { for (const c of l) if ("focus" in c) return c.focus(); return self.clients.openWindow("./"); }));
});
