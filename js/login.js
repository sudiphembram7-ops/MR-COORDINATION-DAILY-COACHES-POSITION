import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

async function login() {
    alert("1");

    try {
        alert("2");
    } catch (e) {
        alert("Error");
    }
}

async function logout() {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error(error);
    }
}

window.login = login;
window.logout = logout;