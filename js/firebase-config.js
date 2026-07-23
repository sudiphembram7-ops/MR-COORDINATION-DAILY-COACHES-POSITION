// Firebase Configuration

const firebaseConfig = {

apiKey: "AIzaSyDs7QAXYKv8SSVsrHPZr3Jh9iZ-1qHMEBs",

authDomain: "mr-coordi-coach.firebaseapp.com",

projectId: "mr-coordi-coach",

storageBucket:
"mr-coordi-coach.firebasestorage.app",

messagingSenderId:
"955185707268",

appId:
"1:955185707268:web:31d017094ffc97da65f851"

};


// Initialize Firebase

firebase.initializeApp(firebaseConfig);


const db = firebase.firestore();