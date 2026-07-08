/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyDYyX4HZ_lEri8stSndAGRPuXF1IIWEuxM",
    authDomain: "ringnex.firebaseapp.com",
    databaseURL: "https://ringnex-default-rtdb.firebaseio.com",
    projectId: "ringnex",
    storageBucket: "ringnex.firebasestorage.app",
    messagingSenderId: "569243935070",
    appId: "1:569243935070:web:0a9c24dda0334de86a2fcf",
    measurementId: "G-3T9LQ25T1L"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("📩 BG message received", payload);

  const title = payload.data?.title || "New Message";
  const body = payload.data?.body || "";

  self.registration.showNotification(title, {
    body,
    icon: "/logo192.png",
    data: payload.data,
  });
});

