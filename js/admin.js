/* =====================================================
   MR CO-ORDINATION
   ADMIN.JS
   PRODUCTION VERSION
   -----------------------------------------------------
   Features:
   1. Firebase Authentication Protection
   2. Admin Login Check
   3. Recent Coach Entry
   4. Firebase Database Status
   5. Refresh
   6. Logout
   7. Realtime History
===================================================== */


/* =====================================================
   FIREBASE IMPORTS
===================================================== */

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    auth,
    database
} from "./firebase-config.js";


/* =====================================================
   GLOBAL
===================================================== */

let currentUser = null;

let historyListenerStarted = false;


/* =====================================================
   START
===================================================== */

console.log("=================================");
console.log("MR ADMIN JS LOADED");
console.log("=================================");


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("ADMIN DOM READY");

    initializeAdmin();

});


/* =====================================================
   ADMIN INITIALIZATION
===================================================== */

function initializeAdmin() {

    setupAuthProtection();

    setupButtons();

    setupDatabaseStatus();

}


/* =====================================================
   LOGIN PROTECTION
===================================================== */

function setupAuthProtection() {

    onAuthStateChanged(auth, (user) => {

        if (!user) {

            console.warn(
                "No Admin Login Found"
            );

            currentUser = null;

            const loginStatus =
                document.getElementById("loginStatus");

            if (loginStatus) {

                loginStatus.innerHTML =
                    '<span class="text-danger">● Not Logged In</span>';

            }

            /*
             * Prevent direct access to admin.html
             */

            window.location.replace(
                "./login.html"
            );

            return;

        }


        /* ==========================
           USER LOGGED IN
        ========================== */

        currentUser = user;

        console.log(
            "Admin Logged In:",
            user.email
        );


        const loginStatus =
            document.getElementById("loginStatus");


        if (loginStatus) {

            loginStatus.innerHTML =
                '<span class="text-success">● Admin Logged In</span>';

        }


        /*
         * Start history only after authentication
         */

        loadRecentEntries();

    });

}


/* =====================================================
   DATABASE CONNECTION STATUS
===================================================== */

function setupDatabaseStatus() {

    const connectedRef =
        ref(database, ".info/connected");


    onValue(

        connectedRef,

        (snapshot) => {

            const connected =
                snapshot.val() === true;


            const databaseStatus =
                document.getElementById(
                    "databaseStatus"
                );


            const footerDatabase =
                document.getElementById(
                    "footerDatabase"
                );


            if (connected) {

                if (databaseStatus) {

                    databaseStatus.innerHTML =
                        '<span class="text-success">● Connected</span>';

                }


                if (footerDatabase) {

                    footerDatabase.innerHTML =
                        '<span class="text-success">● Connected</span>';

                }

            } else {

                if (databaseStatus) {

                    databaseStatus.innerHTML =
                        '<span class="text-danger">● Offline</span>';

                }


                if (footerDatabase) {

                    footerDatabase.innerHTML =
                        '<span class="text-danger">● Offline</span>';

                }

            }

        },

        (error) => {

            console.error(
                "Database Status Error:",
                error
            );

        }

    );

}


/* =====================================================
   RECENT COACH ENTRY
===================================================== */

function loadRecentEntries() {

    if (historyListenerStarted) {

        return;

    }

    historyListenerStarted = true;


    /*
     * Firebase path
     *
     * history/
     */

    const historyRef =
        ref(database, "history");


    onValue(

        historyRef,

        (snapshot) => {

            const historyData =
                snapshot.exists()
                ? snapshot.val()
                : {};


            renderHistory(historyData);


            updateLastUpdate();

        },

        (error) => {

            console.error(
                "History Load Error:",
                error
            );

        }

    );

}


/* =====================================================
   RENDER HISTORY
===================================================== */

function renderHistory(historyData) {

    const tbody =
        document.getElementById(
            "historyBody"
        );


    if (!tbody) {

        console.warn(
            "#historyBody not found"
        );

        return;

    }


    tbody.innerHTML = "";


    const entries =
        Object.entries(historyData);


    /*
     * Latest entries first
     */

    entries.sort((a, b) => {

        const timeA =
            Number(a[1]?.time || 0);

        const timeB =
            Number(b[1]?.time || 0);

        return timeB - timeA;

    });


    /*
     * Show latest 20 entries
     */

    const recentEntries =
        entries.slice(0, 20);


    if (recentEntries.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="text-center text-muted p-4">

                    No Recent Coach Entry

                </td>

            </tr>

        `;

        return;

    }


    recentEntries.forEach(
        ([key, entry]) => {

            const tr =
                document.createElement("tr");


            const shop =
                entry.shop || "-";


            const line =
                entry.line || "-";


            const position =
                entry.position || "-";


            const coachNo =
                entry.coachNo || "-";


            const coachType =
                entry.coachType || "-";


            const status =
                entry.status || "-";


            const action =
                entry.action || "ENTRY";


            tr.innerHTML = `

                <td>
                    ${escapeHTML(shop)}
                </td>

                <td>
                    ${escapeHTML(line)}
                </td>

                <td>
                    ${escapeHTML(position)}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(coachNo)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(coachType)}
                </td>

                <td>
                    <span class="badge bg-primary">
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>

                    <span class="badge bg-secondary">
                        ${escapeHTML(action)}
                    </span>

                </td>

            `;


            tbody.appendChild(tr);

        }

    );

}


/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const element =
        document.getElementById(
            "lastUpdate"
        );


    if (!element) {

        return;

    }


    element.textContent =
        new Date().toLocaleTimeString(
            "en-IN"
        );

}


/* =====================================================
   BUTTONS
===================================================== */

function setupButtons() {

    /*
     * REFRESH
     */

    const refreshBtn =
        document.getElementById(
            "refreshBtn"
        );


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            () => {

                location.reload();

            }
        );

    }


    /*
     * LOGOUT
     */

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logoutAdmin
        );

    }

}


/* =====================================================
   LOGOUT
===================================================== */

async function logoutAdmin() {

    if (!currentUser) {

        window.location.replace(
            "./login.html"
        );

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmed) {

        return;

    }


    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    try {

        if (logoutBtn) {

            logoutBtn.disabled = true;

            logoutBtn.innerHTML =
                '<i class="bi bi-hourglass-split"></i> Logging out...';

        }


        await signOut(auth);


        console.log(
            "Admin Logout Successful"
        );


        window.location.replace(
            "./login.html"
        );


    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );


        alert(
            "Logout Failed: " +
            (error.message || "Unknown error")
        );


        if (logoutBtn) {

            logoutBtn.disabled = false;

            logoutBtn.innerHTML =
                '<i class="bi bi-box-arrow-right"></i> Logout';

        }

    }

}


/* =====================================================
   NETWORK STATUS
===================================================== */

window.addEventListener(
    "online",
    () => {

        console.log(
            "Internet Connected"
        );

    }
);


window.addEventListener(
    "offline",
    () => {

        console.warn(
            "Internet Disconnected"
        );

    }
);


/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

window.addEventListener(
    "error",
    (event) => {

        console.error(
            "Admin JS Error:",
            event.error || event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    (event) => {

        console.error(
            "Admin Promise Error:",
            event.reason
        );

    }
);


/* =====================================================
   DEBUG
===================================================== */

window.adminPanel = {

    getCurrentUser: () => currentUser,

    logout: logoutAdmin,

    reloadHistory: loadRecentEntries

};


/* =====================================================
   READY
===================================================== */

console.log(
    "MR CO-ORDINATION ADMIN PANEL READY"
);