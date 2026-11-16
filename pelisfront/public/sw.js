// Service worker de PeliStreams (copiado de HGC). Hace la app instalable en el celular.
// No guarda nada en caché a propósito: los saldos y apuestas siempre se leen frescos del servidor.
// Ya trae lo necesario para notificaciones (push) por si después se activan. Lo registra shared/lib/pwa.ts.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { titulo: "PeliStreams", cuerpo: e.data ? e.data.text() : "" };
  }
  const titulo = typeof d.titulo === "string" ? d.titulo.slice(0, 80) : "PeliStreams";
  const cuerpo = typeof d.cuerpo === "string" ? d.cuerpo.slice(0, 200) : "";
  // Solo rutas de la misma app (nunca un link externo).
  const url = typeof d.url === "string" && d.url.startsWith("/") ? d.url : "/";
  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: typeof d.tag === "string" ? d.tag : undefined,
      renotify: typeof d.tag === "string",
      vibrate: [80, 40, 80],
      timestamp: Date.now(),
      lang: "es-MX",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (new URL(v.url).origin === self.location.origin && "focus" in v) {
          v.navigate(url);
          return v.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
