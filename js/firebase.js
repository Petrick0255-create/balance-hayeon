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

  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;

  const dayOfYear = Math.floor(diff / oneDay) + 1;
  const week = Math.ceil(dayOfYear / 7);

  return `${now.getFullYear()}-W${week}`;
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
  const currentWeekKey = getWeekKey();

  const snapshot = await getDocs(
    collection(db, "rankings")
  );

  const scores = snapshot.docs
    .map(doc => doc.data())
    .filter(item => item.weekKey === currentWeekKey)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 5);

  console.log("이번 주 TOP5", currentWeekKey, scores);

  return scores;
}