/* =====================================================
   MR CO-ORDINATION
   FIREBASE ADMIN LOGIN
   VERSION 12.0
   EMAIL BASED ADMIN
   NO CUSTOM CLAIM REQUIRED
===================================================== */

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    auth
} from "./firebase-config.js";


/* =====================================================
   ADMIN EMAIL
===================================================== */

const ADMIN_EMAIL =
    "Sudiphembram7@gmail.com";


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
   CHECK ADMIN EMAIL
===================================================== */

function isAdmin(user) {

    if (!user || !user.email) {

        return false;

    }

    return (
        user.email.trim().toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
    );

}


/* =====================================================
   LOGIN
===================================================== */

async function login() {

    if (!emailInput || !passwordInput) {

        console.error(
            "LOGIN INPUT ELEMENTS NOT FOUND"
        );

        return;

    }


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    /* =================================================
       VALIDATION
    ================================================= */

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


    /* =================================================
       ADMIN EMAIL CHECK
    ================================================= */

    if (
        email.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
    ) {

        showMessage(
            "Access Denied. Admin email only.",
            "danger"
        );

        return;

    }


    /* =================================================
       BUTTON LOADING
    ================================================= */

    if (loginBtn) {

        loginBtn.disabled = true;

        loginBtn.textContent =
            "LOGIN...";

    }


    showMessage(
        "Checking Admin login...",
        "primary"
    );


    try {

        /* =================================================
           FIREBASE AUTH
        ================================================= */

        const result =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            result.user;


        console.log(
            "Firebase Login:",
            user.email
        );


        /* =================================================
           SECOND ADMIN CHECK
        ================================================= */

        if (!isAdmin(user)) {

            await signOut(auth);

            showMessage(
                "Access Denied. This account is not Admin.",
                "danger"
            );

            return;

        }


        /* =================================================
           ADMIN LOGIN SUCCESS
        ================================================= */

        showMessage(
            "Admin Login Successful...",
            "success"
        );


        console.log(
            "ADMIN LOGIN SUCCESS:",
            user.email
        );


        /* =================================================
           REDIRECT
        ================================================= */

        setTimeout(() => {

            window.location.replace(
                "admin.html"
            );

        }, 500);


    }
    catch (error) {

        console.error(
            "FIREBASE LOGIN ERROR:",
            error
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
                    "Admin account not found";

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
                    "Admin account is disabled.";

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


    }
    finally {

        if (loginBtn) {

            loginBtn.disabled = false;

            loginBtn.textContent =
                "LOGIN";

        }

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

}


/* =====================================================
   ENTER KEY
===================================================== */

if (passwordInput) {

    passwordInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

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
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                if (passwordInput) {

                    passwordInput.focus();

                }

            }

        }
    );

}


/* =====================================================
   GLOBAL LOGIN
===================================================== */

window.login =
    login;


/* =====================================================
   AUTO CHECK
   If already logged in, open admin
===================================================== */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            console.log(
                "No user logged in."
            );

            return;

        }


        console.log(
            "Existing Firebase User:",
            user.email
        );


        /* =============================================
           ONLY ADMIN CAN CONTINUE
        ============================================= */

        if (
            isAdmin(user)
        ) {

            console.log(
                "Existing Admin Session Found"
            );

            /*
               Don't redirect if already
               on admin.html.
            */

            if (
                !window.location.pathname
                    .toLowerCase()
                    .endsWith(
                        "admin.html"
                    )
            ) {

                window.location.replace(
                    "admin.html"
                );

            }

        }
        else {

            /*
               Any non-admin account
               is immediately signed out.
            */

            console.log(
                "Non-admin account detected."
            );

            signOut(auth);

        }

    }
);


/* =====================================================
   READY
===================================================== */

console.log(
    "========================================="
);

console.log(
    "MR CO-ORDINATION ADMIN LOGIN"
);

console.log(
    "LOGIN SYSTEM VERSION 12.0"
);

console.log(
    "ADMIN EMAIL:",
    ADMIN_EMAIL
);

console.log(
    "EMAIL BASED ADMIN"
);

console.log(
    "NO CUSTOM CLAIM REQUIRED"
);

console.log(
    "========================================="
);