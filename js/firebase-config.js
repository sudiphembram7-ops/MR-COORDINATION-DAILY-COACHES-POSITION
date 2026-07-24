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

    apiKey: "YOUR_API_KEY",

    authDomain: "YOUR_PROJECT.firebaseapp.com",

    databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",

    projectId: "YOUR_PROJECT",

    storageBucket: "YOUR_PROJECT.appspot.com",

    messagingSenderId: "123456789012",

    appId: "1:123456789012:web:xxxxxxxxxxxxxxxx"

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