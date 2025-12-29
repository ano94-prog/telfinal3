// Service Worker for better notification support
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated');
    return self.clients.claim();
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event.notification.tag);
    event.notification.close();

    // Focus or open the admin panel window
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if admin panel is already open
            for (const client of clientList) {
                if (client.url.includes('/admin-control') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open admin panel if not already open
            if (clients.openWindow) {
                return clients.openWindow('/admin-control');
            }
        })
    );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, options } = event.data;
        self.registration.showNotification(title, options);
    }
});
