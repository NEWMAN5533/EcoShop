import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// === Firebase Config (replace with your values) ===
const firebaseConfig = {
  apiKey: "AIzaSyC6lGL985wSmZIedzN-tnkMGkTI3GU_5Mg",
  authDomain: "ecoshop-536ca.firebaseapp.com",
  projectId: "ecoshop-536ca",
  storageBucket: "ecoshop-536ca.firebasestorage.app",
  messagingSenderId: "330229990087",
  appId: "1:330229990087:web:76246b55267c6a65bab4e2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const db = getFirestore(app);

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("error");

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    // Get user role from Firestore
    const uid = userCred.user.uid;
    const roleDoc = await getDoc(doc(db, "roles", uid));

    if (roleDoc.exists() && roleDoc.data().role === "admin") {
      window.location.href = "admin.html";
    } else {
      errorEl.textContent = "You are not authorized!";
    }
  } catch (err) {
    errorEl.textContent = "Login failed: " + err.message;
  }
});

