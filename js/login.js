/* =====================================================
   MR CO-ORDINATION
   FIREBASE ADMIN LOGIN
   Production Version
===================================================== */

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    auth
} from "./firebase-config.js";


console.log("LOGIN JS LOADED");


/* =====================================================
   LOGIN FUNCTION
===================================================== */

async function login() {

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    if (!emailInput || !passwordInput) {

        alert("Email or Password field not found");

        console.error(
            "Missing #email or #password"
        );

        return;

    }


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    if (!email) {

        alert("Please enter Email");

        emailInput.focus();

        return;

    }


    if (!password) {

        alert("Please enter Password");

        passwordInput.focus();

        return;

    }


    const loginBtn =
        document.getElementById("loginBtn");


    try {

        if (loginBtn) {

            loginBtn.disabled = true;
            loginBtn.textContent = "LOGIN...";

        }


        console.log(
            "Firebase login started:",
            email
        );


        const result =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        console.log(
            "Login successful:",
            result.user.email
        );


        alert("Login Successful");


        window.location.href =
            "./admin.html";


    } catch (error) {

        console.error(
            "Firebase Login Error:",
            error
        );


        let message =
            "Login Failed";


        switch (error.code) {

            case "auth/invalid-credential":

                message =
                    "Invalid Email or Password";

                break;


            case "auth/user-not-found":

                message =
                    "User not found";

                break;


            case "auth/wrong-password":

                message =
                    "Wrong Password";

                break;


            case "auth/invalid-email":

                message =
                    "Invalid Email Address";

                break;


            case "auth/too-many-requests":

                message =
                    "Too many login attempts. Please try again later.";

                break;


            case "auth/network-request-failed":

                message =
                    "Network error. Check Internet connection.";

                break;


            default:

                message =
                    error.message ||
                    "Login Failed";

        }


        alert(message);


    } finally {

        if (loginBtn) {

            loginBtn.disabled = false;
            loginBtn.textContent = "LOGIN";

        }

    }

}


/* =====================================================
   BUTTON EVENT
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const loginBtn =
            document.getElementById("loginBtn");


        if (!loginBtn) {

            console.error(
                "LOGIN button #loginBtn not found"
            );

            return;

        }


        loginBtn.addEventListener(
            "click",
            login
        );


        console.log(
            "LOGIN BUTTON READY"
        );

    }
);


/* =====================================================
   ENTER KEY LOGIN
===================================================== */

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            login();

        }

    }
);


/* =====================================================
   OPTIONAL GLOBAL
===================================================== */

window.login = login;