import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

// Dán firebaseConfig của bạn vào đây
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

// Bật bảng chọn tài khoản Google khi đăng nhập
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = getDatabase(app);

export const dbService = {
  // Lắng nghe cảm biến Realtime
  subscribeTelemetry: (uid, callback) => {
    const teleRef = ref(db, `users/${uid}/telemetry`);
    return onValue(teleRef, (snapshot) => {
      callback(snapshot.val() || { temp: 0, humid: 0, soil: 0, light: 0, pump: 0 });
    });
  },

  // Lắng nghe dự báo thời tiết (Cho cả Chủ vườn và Khách)
  subscribeForecast: (uid, callback) => {
    const fRef = ref(db, `users/${uid}/forecast`);
    return onValue(fRef, (snapshot) => {
      callback(snapshot.val() || []);
    });
  },

  // Lưu dự báo thời tiết lên Firebase
  saveForecast: async (uid, forecastList) => {
    const fRef = ref(db, `users/${uid}/forecast`);
    return set(fRef, forecastList);
  },

  // Lấy cài đặt cá nhân (Chỉ chủ vườn)
  subscribeSettings: (uid, callback) => {
    const setRef = ref(db, `users/${uid}/settings`);
    return onValue(setRef, (snapshot) => {
      callback(snapshot.val() || {});
    });
  },

  // Lưu cài đặt
  saveSettings: async (uid, settingsData) => {
    const setRef = ref(db, `users/${uid}/settings`);
    return update(setRef, settingsData);
  },

  // Gửi lệnh điều khiển
  sendControl: async (uid, controlData) => {
    const controlRef = ref(db, `users/${uid}/control`);
    return update(controlRef, controlData);
  }
};