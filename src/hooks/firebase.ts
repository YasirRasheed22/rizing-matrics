//@ts-nocheck

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDGMdxGMjSUznnmWA7D54qUSR5nnSMZYm8",
  authDomain: "aiodialer.firebaseapp.com",
  databaseURL: "https://aiodialer-default-rtdb.firebaseio.com",
  projectId: "aiodialer",
  storageBucket: "aiodialer.firebasestorage.app",
  messagingSenderId: "697103844003",
  appId: "1:697103844003:web:31e7e31f35eadc0add7516",
  measurementId: "G-1DXZQXBR44"
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