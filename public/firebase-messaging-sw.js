/* eslint-disable no-undef */

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// ⚠️ USA EXACTAMENTE LA MISMA CONFIG QUE TU FRONTEND
firebase.initializeApp({
  apiKey: "AIzaSyAGOAndrOy2JbtJjzw4yQJKtBpI0jNA2yU",
  authDomain: "trakly-99bfa.firebaseapp.com",
  projectId: "trakly-99bfa",
  storageBucket: "trakly-99bfa.firebasestorage.app",
  messagingSenderId: "100243710666",
  appId: "1:100243710666:web:2c2c810ddebca460ad4a33",
});

const messaging = firebase.messaging();

// 🔔 Notificación cuando la app está cerrada
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message ", payload);

  const notificationTitle = payload.notification?.title || "Trackly";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png", // opcional
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
