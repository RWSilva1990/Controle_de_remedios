importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyAq_YVjcbzdThDjXKPnRwKCQMSyljLpmL4",
    authDomain: "controle-de-medicamentos-rws.firebaseapp.com",
    projectId: "controle-de-medicamentos-rws",
    storageBucket: "controle-de-medicamentos-rws.firebasestorage.app",
    messagingSenderId: "291620521736",
    appId: "1:291620521736:web:e96a20cba5244808ea4ebd"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Notificações quando o app está fechado/em segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('[SW Background] Notificação recebida:', payload);

    const title = payload.notification?.title || '💊 RWS Remédios';
    const options = {
        body: payload.notification?.body || 'Hora de tomar seu remédio.',
        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💊</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💊</text></svg>',
        vibrate: [200, 100, 200],
        tag: payload.data?.tag || 'remedios',
        data: { url: payload.data?.url || '/' }
    };

    self.registration.showNotification(title, options);
});

// Ao clicar na notificação, abre/foca o app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
