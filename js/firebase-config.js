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

    apiKey: "AIzaSyDs7QAXYKv8SSVsrHPZr3Jh9iZ-1qHMEBs",

    authDomain: "mr-coordi-coach.firebaseapp.com",

    databaseURL: "https://mr-coordi-coach-default-rtdb.firebaseio.com",

    projectId: "mr-coordi-coach",

    storageBucket: "mr-coordi-coach.firebasestorage.app",

    messagingSenderId: "955185707268",

    appId: "1:955185707268:web:706c031162f6152565f851"

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