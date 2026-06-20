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

  const firstDay = new Date(year, 0, 1);
  const days = Math.floor((now - firstDay) / 86400000);
  const week = Math.ceil((days + firstDay.getDay() + 1) / 7);

  return `${year}-W${week}`;
}

export async function saveScore(score) {
  await addDoc(collection(db, "rankings"), {
    score: Number(score),
    weekKey: getWeekKey(),
    createdAt: serverTimestamp()
  });
}

export async function getTop5() {
  const q = query(
    collection(db, "rankings"),
    where("weekKey", "==", getWeekKey()),
    orderBy("score", "desc"),
    limit(5)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => doc.data());
}