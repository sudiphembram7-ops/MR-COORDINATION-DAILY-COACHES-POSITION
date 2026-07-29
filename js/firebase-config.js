/* ==========================================
   firebase-config.js
   Firebase Configuration
========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/* ==========================================
   YOUR FIREBASE CONFIG
========================================== */

const firebaseConfig = {

    apiKey: "YOUR_API_KEY",

    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",

    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",

    projectId: "YOUR_PROJECT_ID",

    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",

    messagingSenderId: "YOUR_SENDER_ID",

    appId: "YOUR_APP_ID"

};

/* ==========================================
   INITIALIZE FIREBASE
========================================== */

const app = initializeApp(firebaseConfig);

/* ==========================================
   EXPORT SERVICES
========================================== */

export const database = getDatabase(app);

export const auth = getAuth(app);

export default app;

/* ==========================================
   CHECK
========================================== */

console.log("Firebase Connected Successfully");