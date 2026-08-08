/* =====================================================
   MR CO-ORDINATION
   LOGIN.JS
   Firebase Authentication
===================================================== */

import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


// =====================================================
// LOGIN FUNCTION
// =====================================================

async function login() {

    const emailElement = document.getElementById("email");
    const passwordElement = document.getElementById("password");

    if (!emailElement || !passwordElement) {
        console.error("Email or Password input not found.");
        alert("Login form error. Please contact Admin.");
        return;
    }

    const email = emailElement.value.trim();
    const password = passwordElement.value;


    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!email) {
        alert("Please enter your email.");
        emailElement.focus();
        return;
    }

    if (!password) {
        alert("Please enter your password.");
        passwordElement.focus();
        return;
    }


    // ---------------------------------------------------
    // FIREBASE LOGIN
    // ---------------------------------------------------

    try {

        console.log("Firebase login started...");

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        console.log("Firebase login successful.");

        alert("Login Successful");


        // ------------------------------------------------
        // REDIRECT TO ADMIN PAGE
        // ------------------------------------------------

        window.location.replace("admin.html");


    } catch (error) {

        console.error("Firebase Login Error:", error);

        let message = "Login failed.";

        switch (error.code) {

            case "auth/invalid-credential":
                message = "Invalid email or password.";
                break;

            case "auth/user-not-found":
                message = "User not found.";
                break;

            case "auth/wrong-password":
                message = "Incorrect password.";
                break;

            case "auth/invalid-email":
                message = "Invalid email address.";
                break;

            case "auth/user-disabled":
                message = "This account has been disabled.";
                break;

            case "auth/too-many-requests":
                message = "Too many login attempts. Please try again later.";
                break;

            case "auth/network-request-failed":
                message = "Network error. Please check your internet connection.";
                break;

            default:
                message = error.message || "Unable to login.";
        }

        alert(message);
    }
}


// =====================================================
// LOGOUT FUNCTION
// =====================================================

async function logout() {

    try {

        await signOut(auth);

        console.log("Logout successful.");

        window.location.replace("login.html");

    } catch (error) {

        console.error("Logout Error:", error);

        alert("Logout failed. Please try again.");
    }
}


// =====================================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// =====================================================

window.login = login;
window.logout = logout;


// =====================================================
// ENTER KEY LOGIN
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    const passwordElement = document.getElementById("password");

    if (passwordElement) {

        passwordElement.addEventListener("keydown", (event) => {

            if (event.key === "Enter") {
                login();
            }

        });
    }

});