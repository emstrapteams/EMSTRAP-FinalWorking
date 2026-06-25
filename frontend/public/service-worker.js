// public/service-worker.js

self.addEventListener("push", (event) => {
    const data = event.data ? event.data.json() : {};

    const title = data.title || "🚑 New Emergency Alert!";
    const options = {
        body: data.body || "A patient needs help nearby. Tap to open dashboard.",
        icon: "/vite.svg", // Using default icon as placeholder
        badge: "/vite.svg",
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
            url: data.url || "/ambulance"
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(event.notification.data.url) && "focus" in client) {
                    return client.focus();
                }
            }

            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
