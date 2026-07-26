/* =====================================================
   firebase-config.js
   Firebase v11 Configuration
===================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/* =====================================================
   YOUR FIREBASE CONFIG
   Replace these values with your own project settings.
===================================================== */

const firebaseConfig = {

    apiKey: "AIzaSyDs7QAXYKv8SSVsrHPZr3Jh9iZ-1qHMEBs",

    authDomain: "mr-coordi-coach.firebaseapp.com",

    databaseURL: "https://mr-coordi-coach-default-rtdb.firebaseio.com",

    projectId: "mr-coordi-coach",

    storageBucket: "mr-coordi-coach.firebasestorage.app",

    messagingSenderId: "955185707268",

    appId: "1:955185707268:web:31d017094ffc97da65f851"

};

/* =====================================================
   INITIALIZE FIREBASE
===================================================== */

const app = initializeApp(firebaseConfig);

const database = getDatabase(app);

const auth = getAuth(app);

/* =====================================================
   EXPORT
===================================================== */

export { app, database, auth };