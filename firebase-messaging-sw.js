// 1. Importa os scripts base do Firebase para o Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 2. Suas credenciais do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAq_YVjcbzdThDjXKPnRwKCQMSyljLpmL4",
    authDomain: "controle-de-medicamentos-rws.firebaseapp.com",
    projectId: "controle-de-medicamentos-rws",
    storageBucket: "controle-de-medicamentos-rws.firebasestorage.app",
    messagingSenderId: "291620521736",
    appId: "1:291620521736:web:e96a20cba5244808ea4ebd"
};

// 3. Inicializa o Firebase em segundo plano
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 4. Escuta as notificações quando o app está fechado
messaging.onBackgroundMessage((payload) => {
    console.log('[Background] Notificação recebida: ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💊</text></svg>',
        data: { url: '/' } // Define para onde vai ao clicar
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});