/* =====================================================
   MR CO-ORDINATION
   FIREBASE ADMIN LOGIN
   FINAL PRODUCTION VERSION
===================================================== */

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    auth
} from "./firebase-config.js";


console.log("=================================");
console.log("LOGIN JS LOADED");
console.log("AUTH OBJECT:", auth);
console.log("=================================");


/* =====================================================
   ELEMENTS
===================================================== */

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginBtn =
    document.getElementById("loginBtn");

const message =
    document.getElementById("message");


/* =====================================================
   CHECK ELEMENTS
===================================================== */

if (!emailInput) {
    console.error("ERROR: #email not found");
}

if (!passwordInput) {
    console.error("ERROR: #password not found");
}

if (!loginBtn) {
    console.error("ERROR: #loginBtn not found");
}


/* =====================================================
   SHOW MESSAGE
===================================================== */

function showMessage(
    text,
    type = "danger"
) {

    if (!message) return;

    message.textContent = text;

    message.className =
        `mt-3 text-center text-${type}`;

}


/* =====================================================
   LOGIN
===================================================== */

async function login() {

    console.log("LOGIN BUTTON CLICKED");


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    /* ==========================
       VALIDATION
    ========================== */

    if (!email) {

        showMessage(
            "Please enter Email",
            "danger"
        );

        emailInput.focus();

        return;
    }


    if (!password) {

        showMessage(
            "Please enter Password",
            "danger"
        );

        passwordInput.focus();

        return;
    }


    /* ==========================
       BUTTON LOADING
    ========================== */

    loginBtn.disabled = true;

    loginBtn.textContent =
        "LOGIN...";


    showMessage(
        "Checking login...",
        "primary"
    );


    try {

        console.log(
            "Firebase authentication starting..."
        );


        /* ==========================
           FIREBASE LOGIN
        ========================== */

        const result =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        console.log(
            "LOGIN SUCCESS:",
            result.user.email
        );


        showMessage(
            "Login Successful. Opening Admin...",
            "success"
        );


        /* ==========================
           REDIRECT
        ========================== */

        setTimeout(() => {

            window.location.href =
                "admin.html";

        }, 500);


    } catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "FIREBASE LOGIN ERROR"
        );

        console.error(
            "CODE:",
            error.code
        );

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            "================================="
        );


        let errorMessage =
            "Login Failed";


        switch (error.code) {


            case "auth/invalid-credential":

                errorMessage =
                    "Invalid Email or Password";

                break;


            case "auth/invalid-email":

                errorMessage =
                    "Invalid Email Address";

                break;


            case "auth/user-not-found":

                errorMessage =
                    "User Not Found";

                break;


            case "auth/wrong-password":

                errorMessage =
                    "Wrong Password";

                break;


            case "auth/too-many-requests":

                errorMessage =
                    "Too many attempts. Please try again later.";

                break;


            case "auth/network-request-failed":

                errorMessage =
                    "Network Error. Check Internet.";

                break;


            case "auth/user-disabled":

                errorMessage =
                    "This user account is disabled.";

                break;


            default:

                errorMessage =
                    error.message ||
                    "Login Failed";

        }


        showMessage(
            errorMessage,
            "danger"
        );


    } finally {

        loginBtn.disabled = false;

        loginBtn.textContent =
            "LOGIN";

    }

}


/* =====================================================
   LOGIN BUTTON
===================================================== */

if (loginBtn) {

    loginBtn.addEventListener(
        "click",
        login
    );

    console.log(
        "LOGIN BUTTON EVENT ATTACHED"
    );

}


/* =====================================================
   ENTER KEY
===================================================== */

if (passwordInput) {

    passwordInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                login();

            }

        }
    );

}


/* =====================================================
   EMAIL ENTER
===================================================== */

if (emailInput) {

    emailInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                passwordInput.focus();

            }

        }
    );

}


/* =====================================================
   GLOBAL
===================================================== */

window.login = login;


console.log(
    "LOGIN SYSTEM READY"
);