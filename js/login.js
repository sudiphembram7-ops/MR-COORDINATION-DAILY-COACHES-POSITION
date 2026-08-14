/* =====================================================
   MR CO-ORDINATION
   FIREBASE ADMIN LOGIN
   VERSION 12.0 FINAL
===================================================== */

import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    auth
} from "./firebase-config.js";


/* =====================================================
   DEBUG
===================================================== */

console.log("=================================");
console.log("MR CO-ORDINATION LOGIN");
console.log("LOGIN.JS VERSION 12.0");
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

const loginForm =
    document.getElementById("loginForm");

const message =
    document.getElementById("message");


/* =====================================================
   CHECK ELEMENTS
===================================================== */

if (!emailInput) {
    console.error("LOGIN ERROR: #email not found");
}

if (!passwordInput) {
    console.error("LOGIN ERROR: #password not found");
}

if (!loginBtn) {
    console.error("LOGIN ERROR: #loginBtn not found");
}

if (!loginForm) {
    console.error("LOGIN ERROR: #loginForm not found");
}


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(
    text,
    type = "danger"
) {

    if (!message) {
        return;
    }

    message.textContent = text;

    message.className =
        `mt-3 text-center text-${type}`;

}


/* =====================================================
   BUTTON STATE
===================================================== */

function setLoading(
    loading
) {

    if (!loginBtn) {
        return;
    }


    loginBtn.disabled =
        loading;


    loginBtn.textContent =
        loading
            ? "LOGIN..."
            : "LOGIN";

}


/* =====================================================
   FIREBASE ERROR MESSAGE
===================================================== */

function getFirebaseErrorMessage(
    error
) {

    console.error(
        "Firebase Error:",
        error
    );


    switch (error?.code) {

        case "auth/invalid-email":

            return "Invalid Email Address.";


        case "auth/user-not-found":

            return "User Not Found.";


        case "auth/wrong-password":

            return "Wrong Password.";


        case "auth/invalid-credential":

            return "Invalid Email or Password.";


        case "auth/user-disabled":

            return "This user account is disabled.";


        case "auth/too-many-requests":

            return "Too many login attempts. Please try again later.";


        case "auth/network-request-failed":

            return "Network Error. Check your Internet connection.";


        case "auth/operation-not-allowed":

            return "Email/Password Login is disabled in Firebase.";


        case "auth/internal-error":

            return "Firebase internal error. Please try again.";


        default:

            return (
                error?.message ||
                "Login Failed."
            );

    }

}


/* =====================================================
   LOGIN
===================================================== */

async function login(
    event = null
) {

    if (event) {

        event.preventDefault();

    }


    console.log(
        "LOGIN STARTED"
    );


    if (
        !emailInput ||
        !passwordInput ||
        !loginBtn
    ) {

        console.error(
            "Login elements missing."
        );

        return;

    }


    const email =
        emailInput.value
            .trim()
            .toLowerCase();


    const password =
        passwordInput.value;


    /* =================================================
       VALIDATION
    ================================================= */

    if (!email) {

        showMessage(
            "Please enter Email.",
            "danger"
        );

        emailInput.focus();

        return;

    }


    if (!password) {

        showMessage(
            "Please enter Password.",
            "danger"
        );

        passwordInput.focus();

        return;

    }


    /* =================================================
       LOADING
    ================================================= */

    setLoading(true);


    showMessage(
        "Checking login...",
        "primary"
    );


    try {

        console.log(
            "Firebase authentication starting..."
        );


        /* =============================================
           FIREBASE AUTH
        ============================================= */

        const result =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            result.user;


        console.log(
            "LOGIN SUCCESS"
        );


        console.log(
            "USER UID:",
            user.uid
        );


        console.log(
            "USER EMAIL:",
            user.email
        );


        showMessage(
            "Login Successful. Opening Admin...",
            "success"
        );


        /* =============================================
           REDIRECT
        ============================================= */

        setTimeout(
            () => {

                window.location.replace(
                    "./admin.html"
                );

            },
            500
        );

    }
    catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "FIREBASE LOGIN ERROR"
        );

        console.error(
            "CODE:",
            error?.code
        );

        console.error(
            "MESSAGE:",
            error?.message
        );

        console.error(
            "================================="
        );


        showMessage(
            getFirebaseErrorMessage(
                error
            ),
            "danger"
        );


        setLoading(false);

    }

}


/* =====================================================
   FORM SUBMIT
===================================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        login
    );

}


/* =====================================================
   LOGIN BUTTON FALLBACK
===================================================== */

if (
    loginBtn &&
    !loginForm
) {

    loginBtn.addEventListener(
        "click",
        login
    );

}


/* =====================================================
   AUTO AUTH CHECK
===================================================== */

if (auth) {

    onAuthStateChanged(
        auth,
        user => {

            console.log(
                "AUTH STATE:",
                user
                    ? user.email
                    : "NOT LOGGED IN"
            );


            /*
               If already logged in,
               open admin automatically.
            */

            if (user) {

                showMessage(
                    "Already logged in. Opening Admin...",
                    "success"
                );


                setTimeout(
                    () => {

                        window.location.replace(
                            "./admin.html"
                        );

                    },
                    300
                );

            }

        }
    );

}


/* =====================================================
   GLOBAL
===================================================== */

window.login =
    login;


/* =====================================================
   READY
===================================================== */

console.log(
    "LOGIN SYSTEM READY"
);