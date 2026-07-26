import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();

async function login() {

    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {

        await signInWithEmailAndPassword(auth, email, password);

        window.location.href = "admin.html";

    } catch (error) {

        document.getElementById("message").textContent = error.message;

    }

}

// Logout
async function logout() {

    try {

        await signOut(auth);

        window.location.href = "login.html";

    } catch (error) {

        console.error(error);

    }

}
