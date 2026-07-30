import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { auth } from "./firebase-config.js";

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

    loginBtn.addEventListener("click", async () => {

        const email = document.getElementById("username").value.trim();

        const password = document.getElementById("password").value;

        try {

            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            localStorage.setItem("isAdmin", "true");
            localStorage.setItem("adminUID", userCredential.user.uid);

            window.location.href = "admin.html";

        } catch (e) {

            alert("Invalid Email or Password");

        }

    });

}

onAuthStateChanged(auth, (user) => {

    if (user) {

        localStorage.setItem("isAdmin", "true");

    } else {

        localStorage.removeItem("isAdmin");
        localStorage.removeItem("adminUID");

    }

});

window.logout = async function () {

    await signOut(auth);

    localStorage.clear();

    window.location.href = "login.html";

};