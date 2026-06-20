import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAx7c2vMVzsPtMmlT1-J9UcF92J_sKnRYE",
  authDomain: "blance-hayeon-rankings.firebaseapp.com",
  projectId: "blance-hayeon-rankings",
  storageBucket: "blance-hayeon-rankings.firebasestorage.app",
  messagingSenderId: "866494747318",
  appId: "1:866494747318:web:da1bf6be56cdae85c38c17"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function getWeekKey() {
  const now = new Date();
  const year = now.getFullYear();

  // 주차 계산 꼬임 방지용 단순 주차 키
  const week = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));

  return `${year}-W${week}`;
}

export async function saveScore(score) {
  const data = {
    score: Number(score),
    weekKey: getWeekKey(),
    createdAt: serverTimestamp()
  };

  console.log("저장 시도:", data);

  await addDoc(collection(db, "rankings"), data);

  console.log("저장 성공");
}

export async function getTop5() {
  const weekKey = getWeekKey();

  console.log("랭킹 조회 weekKey:", weekKey);

  const q = query(
    collection(db, "rankings"),
    where("weekKey", "==", weekKey),
    orderBy("score", "desc"),
    limit(5)
  );

  const snapshot = await getDocs(q);

  console.log("랭킹 개수:", snapshot.size);

  return snapshot.docs.map(doc => doc.data());
}