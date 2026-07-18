// =====================================================================
// ตั้งค่า Firebase ของคุณ
// =====================================================================

const firebaseConfig = {
  apiKey: "AIzaSyCSnVboMaDlW90oU0PVX1iSjFDnkmsV2bs",
  authDomain: "pea-transformer.firebaseapp.com",
  projectId: "pea-transformer",
  storageBucket: "pea-transformer.firebasestorage.app",
  messagingSenderId: "964466534616",
  appId: "1:964466534616:web:1a0a55aecace235a84fad",
  measurementId: "G-QNV1608SYW"
};

// =====================================================================
// เปิดใช้งาน Firebase App + Firestore
// (ต้องโหลด firebase-app-compat.js และ firebase-firestore-compat.js ก่อนไฟล์นี้)
// =====================================================================
if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ตัวแปร db ใช้เชื่อมกับ Firestore เพื่อให้ประวัติ sync ข้ามอุปกรณ์
const db = (typeof firebase !== "undefined" && firebase.firestore)
  ? firebase.firestore()
  : null;
