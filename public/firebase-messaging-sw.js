/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBcDDgfCXIh7XtfgN5AEK83p7LlmpMzEkk",
  authDomain: "rizing-matrics.firebaseapp.com",
  databaseURL: "https://rizing-matrics-default-rtdb.firebaseio.com",
  projectId: "rizing-matrics",
  storageBucket: "rizing-matrics.firebasestorage.app",
  messagingSenderId: "536811229367",
  appId: "1:536811229367:web:fdcdff24f425946b023d32"
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

