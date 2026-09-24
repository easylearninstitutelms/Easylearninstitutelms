self.addEventListener("push", (event) => {
  let data = {
    title: "Easylearn Institute",
    body: "You have a new notification.",
    url: "/student",
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title || "Easylearn Institute", {
      body: data.body || "You have a new notification.",
      icon: "/easylearn-logo.jpg",
      badge: "/easylearn-logo.jpg",
      data: { url: data.url || "/student" },
      tag: "easylearn-notification",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/student";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    }),
  );
});
