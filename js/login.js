import { auth } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

async function login() {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        await signInWithEmailAndPassword(auth, email, password);

        alert("Login Successful");

        window.location.href = "admin.html";

    } catch (error) {

        console.log(error);
        alert(error.code);
        alert(error.message);

    }
}

async function logout() {

    try {

        await signOut(auth);

        window.location.href = "login.html";

    } catch (error) {

        console.log(error);

    }
}

window.login = login;
window.logout = logout;
