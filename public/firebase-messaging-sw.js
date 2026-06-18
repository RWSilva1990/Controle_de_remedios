importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDCJEYgFMWnEOTav_Hzku28PK88Mi_jQgw",
  authDomain: "controle-de-medicamentos-rws.firebaseapp.com",
  projectId: "controle-de-medicamentos-rws",
  storageBucket: "controle-de-medicamentos-rws.firebasestorage.app",
  messagingSenderId: "291620521736",
  appId: "1:291620521736:web:e96a20cba5244808ea4ebd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title   = payload.notification?.title || '💊 RWS Remédios';
  const options = {
    body: payload.notification?.body || 'Hora de tomar seu remédio.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || 'remedios',
    data: { url: payload.data?.url || '/' }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
