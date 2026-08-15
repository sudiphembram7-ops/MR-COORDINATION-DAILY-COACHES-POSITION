/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-CONFIG.JS
   VERSION 12.0 FINAL
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   FIREBASE AUTH
   COMPATIBLE WITH:
   ---------------------------------------------------------
   board.html
   board.js
   firebase-board.js
   firebase-admin.js
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
    getDatabase
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


/* =========================================================
   FIREBASE CONFIGURATION
   ---------------------------------------------------------
   IMPORTANT:
   Replace ONLY the values below with your Firebase
   project's actual configuration.
========================================================= */

const firebaseConfig = {

    apiKey: "YOUR_API_KEY",

    authDomain:
        "YOUR_PROJECT_ID.firebaseapp.com",

    databaseURL:
        "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",

    projectId:
        "YOUR_PROJECT_ID",

    storageBucket:
        "YOUR_PROJECT_ID.firebasestorage.app",

    messagingSenderId:
        "YOUR_MESSAGING_SENDER_ID",

    appId:
        "YOUR_APP_ID"

};


/* =========================================================
   INITIALIZE FIREBASE
========================================================= */

const app =
    initializeApp(firebaseConfig);


/* =========================================================
   REALTIME DATABASE
========================================================= */

const database =
    getDatabase(app);


/* =========================================================
   FIREBASE AUTHENTICATION
========================================================= */

const auth =
    getAuth(app);


/* =========================================================
   EXPORT
========================================================= */

export {
    app,
    database,
    auth
};


/* =========================================================
   CONNECTION TEST
========================================================= */

console.log(
    "🔥 Firebase initialized successfully"
);

console.log(
    "🔥 Realtime Database:",
    database ? "READY" : "ERROR"
);

console.log(
    "🔐 Firebase Auth:",
    auth ? "READY" : "ERROR"
);