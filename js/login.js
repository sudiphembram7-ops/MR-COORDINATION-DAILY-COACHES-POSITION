import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

async function login() {
    alert("1. Login button clicked");

    try {
        alert("2. Before signIn");

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        await signInWithEmailAndPassword(auth, email, password);

        alert("3. Login Successful");

        window.location.href = "admin.html";

    } catch (error) {
        alert("4. Error: " + error.code);
        console.error(error);
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