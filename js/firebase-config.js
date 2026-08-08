/* ==========================================
   firebase-config.js
   MR CO-ORDINATION
   FIREBASE CONFIGURATION
========================================== */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
    getDatabase
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


/* ==========================================
   FIREBASE CONFIG
========================================== */

const firebaseConfig = {

    apiKey: "AIzaSyDs7QAXYKv8SSVsrHPZr3Jh9iZ-1qHMEBs",

    authDomain:
        "mr-coordi-coach.firebaseapp.com",

    databaseURL:
        "https://mr-coordi-coach-default-rtdb.firebaseio.com",

    projectId:
        "mr-coordi-coach",

    storageBucket:
        "mr-coordi-coach.firebasestorage.app",

    messagingSenderId:
        "955185707268",

    appId:
        "1:955185707268:web:706c031162f6152565f851",

    measurementId:
        "G-P6YEBEEWM3"
};


/* ==========================================
   INITIALIZE FIREBASE
========================================== */

const app = initializeApp(firebaseConfig);


/* ==========================================
   REALTIME DATABASE
========================================== */

export const database =
    getDatabase(
        app,
        firebaseConfig.databaseURL
    );


/* ==========================================
   FIREBASE AUTH
========================================== */

export const auth =
    getAuth(app);


/* ==========================================
   DEFAULT EXPORT
========================================== */

export default app;


/* ==========================================
   DEBUG
========================================== */

console.log(
    "======================================"
);

console.log(
    "Firebase App Initialized"
);

console.log(
    "Project: mr-coordi-coach"
);

console.log(
    "Realtime Database Initialized"
);

console.log(
    "Firebase Authentication Initialized"
);

console.log(
    "======================================"
);