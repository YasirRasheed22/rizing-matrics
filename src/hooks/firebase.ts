//@ts-nocheck

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBcDDgfCXIh7XtfgN5AEK83p7LlmpMzEkk",
  authDomain: "rizing-matrics.firebaseapp.com",
  databaseURL: "https://rizing-matrics-default-rtdb.firebaseio.com",
  projectId: "rizing-matrics",
  storageBucket: "rizing-matrics.firebasestorage.app",
  messagingSenderId: "536811229367",
  appId: "1:536811229367:web:fdcdff24f425946b023d32"
};
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Notifications
export const messaging = getMessaging(app);

export const requestFcmToken = async () => {
  return await getToken(messaging, {
    vapidKey: "BFp3QlLDfIxvCIkDLP1JnkxNrHAz6bJtaKMb-u3ajdbYoeUxy3hjKbjJD0V_ub0gV5XGEwfJEMOvGyRrJzhymyg",
  });
};
export const onForegroundMessage = (cb: any) => {
  const { title, body } = cb.notification || {};

  onMessage(messaging, cb);
  
};