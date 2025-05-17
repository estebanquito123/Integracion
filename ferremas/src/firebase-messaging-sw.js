importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDSAO1qifKDwFk2kX7wO9XWA9NSgFM5NVs",
  authDomain: "ferremas2-19f3f.firebaseapp.com",
  projectId: "ferremas2-19f3f",
  storageBucket: "ferremas2-19f3f.firebasestorage.app",
  messagingSenderId: "447290215984",
  appId: "1:447290215984:web:6ebd14885dfb1fef2727f5",
  measurementId: "G-GNF7MK90Y7"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './assets/icons/icon-72x72.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
