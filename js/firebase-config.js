/* ==========================================
   firebase-config.js
   MR CO-ORDINATION
   FIREBASE CONFIGURATION
   VERSION 11.2 FINAL

   COMPATIBLE WITH:
   ------------------------------------------------
   board.js VERSION 10.0 FINAL
   firebase-board.js VERSION 10.0 FINAL

   SUPPORT:
   ------------------------------------------------
   GitHub Pages
   iPhone / iPad
   Safari
   Chrome
   Desktop
   Firebase Realtime Database
   Firebase Authentication
========================================== */


/* ==========================================
   FIREBASE APP
========================================== */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";


/* ==========================================
   FIREBASE REALTIME DATABASE
========================================== */

import {
    getDatabase,
    goOnline
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* ==========================================
   FIREBASE AUTHENTICATION
========================================== */

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


/* ==========================================
   FIREBASE CONFIG
========================================== */

const firebaseConfig = {

    apiKey:
        "AIzaSyDs7QAXYKov8SSVsrHPZr3Jh9iZ-1qHMEBs",

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
   INITIALIZE FIREBASE APP
========================================== */

let app;

try {

    app =
        initializeApp(
            firebaseConfig
        );

}
catch (error) {

    console.error(
        "FIREBASE APP INITIALIZATION ERROR:",
        error
    );

    throw error;

}


/* ==========================================
   INITIALIZE REALTIME DATABASE
========================================== */

let database;

try {

    database =
        getDatabase(
            app
        );

}
catch (error) {

    console.error(
        "FIREBASE DATABASE INITIALIZATION ERROR:",
        error
    );

    throw error;

}


/* ==========================================
   FORCE DATABASE ONLINE
========================================== */

try {

    goOnline(
        database
    );

}
catch (error) {

    console.error(
        "FIREBASE GO ONLINE ERROR:",
        error
    );

}


/* ==========================================
   INITIALIZE FIREBASE AUTH
========================================== */

let auth;

try {

    auth =
        getAuth(
            app
        );

}
catch (error) {

    console.error(
        "FIREBASE AUTH INITIALIZATION ERROR:",
        error
    );

    throw error;

}


/* ==========================================
   DATABASE URL
========================================== */

export const FIREBASE_DATABASE_URL =
    firebaseConfig.databaseURL;


/* ==========================================
   FIREBASE PROJECT ID
========================================== */

export const FIREBASE_PROJECT_ID =
    firebaseConfig.projectId;


/* ==========================================
   EXPORT FIREBASE OBJECTS
========================================== */

export {

    app,

    database,

    auth

};


/* ==========================================
   DEFAULT EXPORT
========================================== */

export default app;


/* ==========================================
   DEBUG INFORMATION
========================================== */

console.log(
    "=========================================="
);

console.log(
    "MR CO-ORDINATION FIREBASE CONFIG"
);

console.log(
    "VERSION 11.2 FINAL"
);

console.log(
    "=========================================="
);

console.log(
    "Firebase App: INITIALIZED"
);

console.log(
    "Project:",
    firebaseConfig.projectId
);

console.log(
    "Database:",
    firebaseConfig.databaseURL
);

console.log(
    "Realtime Database: INITIALIZED"
);

console.log(
    "Firebase Auth: INITIALIZED"
);

console.log(
    "GitHub Pages: READY"
);

console.log(
    "iPhone / Safari: READY"
);

console.log(
    "=========================================="
);