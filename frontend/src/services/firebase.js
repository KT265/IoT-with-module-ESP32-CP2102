import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB6hc9HPtui7GST-GWSaRcQp-N09m9Cp10",
  authDomain: "project-grologic.firebaseapp.com",
  databaseURL: "https://project-grologic-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "project-grologic",
  storageBucket: "project-grologic.firebasestorage.app",
  messagingSenderId: "925752962369",
  appId: "1:925752962369:web:dcd9bf209323954a4885c0"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = getDatabase(app);

export const dbService = {
  // Lắng nghe cảm biến Realtime
  subscribeTelemetry: (uid, callback) => {
    const teleRef = ref(db, `users/${uid}/telemetry`);
    return onValue(teleRef, (snapshot) => {
      callback(snapshot.val() || { temp: 0, humid: 0, soil: 0, light: 0, pump: 0 });
    });
  },

  // LẮNG NGHE LỊCH SỬ BIỂU ĐỒ 24H
  subscribeHistory: (uid, callback) => {
    const histRef = ref(db, `users/${uid}/history`);
    return onValue(histRef, (snapshot) => {
      callback(snapshot.val() || null);
    });
  },

  // LƯU LỊCH SỬ BIỂU ĐỒ LÊN FIREBASE
  saveHistory: async (uid, historyData) => {
    const histRef = ref(db, `users/${uid}/history`);
    return set(histRef, historyData);
  },

  // Dự báo thời tiết
  subscribeForecast: (uid, callback) => {
    const fRef = ref(db, `users/${uid}/forecast`);
    return onValue(fRef, (snapshot) => {
      callback(snapshot.val() || []);
    });
  },

  saveForecast: async (uid, forecastList) => {
    const fRef = ref(db, `users/${uid}/forecast`);
    return set(fRef, forecastList);
  },

  // Cài đặt & Điều khiển
  subscribeSettings: (uid, callback) => {
    const setRef = ref(db, `users/${uid}/settings`);
    return onValue(setRef, (snapshot) => {
      callback(snapshot.val() || {});
    });
  },

  saveSettings: async (uid, settingsData) => {
    const setRef = ref(db, `users/${uid}/settings`);
    return update(setRef, settingsData);
  },

  sendControl: async (uid, controlData) => {
    const controlRef = ref(db, `users/${uid}/control`);
    return update(controlRef, controlData);
  }
};