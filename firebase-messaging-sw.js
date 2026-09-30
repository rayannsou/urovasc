/* Notifications push du Planning Imagerie (Firebase Cloud Messaging) */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: 'AIzaSyCv7F339zZWjVR9AS3FjQ0yi9IqEMHZv-8',
  authDomain: 'planning-uro.firebaseapp.com',
  projectId: 'planning-uro',
  storageBucket: 'planning-uro.firebasestorage.app',
  messagingSenderId: '843050426921',
  appId: '1:843050426921:web:fb6c5d2bd88f5491213238'
});
/* les messages « notification » sont affichés par le navigateur ; on ouvre l'appli au toucher */
firebase.messaging();
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(l => {
    for (const c of l) if ('focus' in c) return c.focus();
    return clients.openWindow('./');
  }));
});
