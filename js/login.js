import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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

}}
// Logout
function logout() {
  sessionStorage.clear();
  window.location.href = "login.html";
}
