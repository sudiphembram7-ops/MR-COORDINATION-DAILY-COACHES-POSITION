/* ==========================================
   firebase-config.js
   MR CO-ORDINATION
   FIREBASE CONFIGURATION
   VERSION 11.1
   GITHUB PAGES + IPHONE / SAFARI
========================================== */


import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";


import {
    getDatabase,
    goOnline
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


import {
    getAuth
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


/* ==========================================
   FIREBASE CONFIG
========================================== */

const firebaseConfig = {

    apiKey:
        "AIzaSyDs7QAXYKv8SSVsrHPZr3Jh9iZ-1qHMEBs",

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
   INITIALIZE APP
========================================== */

const app =
    initializeApp(
        firebaseConfig
    );


/* ==========================================
   REALTIME DATABASE
========================================== */

const database =
    getDatabase(
        app
    );


/* ==========================================
   FORCE ONLINE
========================================== */

goOnline(
    database
);


/* ==========================================
   AUTH
========================================== */

const auth =
    getAuth(
        app
    );


/* ==========================================
   EXPORT
========================================== */

export {
    database,
    auth
};


export const FIREBASE_DATABASE_URL =
    firebaseConfig.databaseURL;


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
    "Project:",
    firebaseConfig.projectId
);

console.log(
    "Database URL:",
    firebaseConfig.databaseURL
);

console.log(
    "Realtime Database: INITIALIZED"
);

console.log(
    "Firebase Auth: INITIALIZED"
);

console.log(
    "======================================"
);