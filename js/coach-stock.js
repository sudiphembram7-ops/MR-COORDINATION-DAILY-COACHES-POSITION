
/* =========================================================
   MR COACH STOCK DASHBOARD
   COACH-STOCK.JS
   VERSION 1.0 FINAL
   ---------------------------------------------------------
   HTML:
   Coach-stock.html

   FIREBASE:
   firebase-config.js
   firebase-coach-stock.js

   FEATURES:
   ✔ ADMIN LOGIN
   ✔ EDITOR LOGIN
   ✔ ADD COACH
   ✔ UPDATE COACH
   ✔ DELETE COACH
   ✔ AUTOMATIC DETENTION DAY
   ✔ SEARCH COACH
   ✔ SHOP FILTER
   ✔ EXCEL CSV EXPORT
   ✔ LIVE DASHBOARD
========================================================= */

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { auth } from "./firebase-config.js";

import {
    addCoach,
    updateCoach,
    deleteCoach,
    listenCoachStock,
    calculateDetentionDay
} from "./firebase-coach-stock.js";


/* =========================================================
   DOM ELEMENTS
========================================================= */

const loginSection =
    document.getElementById("loginSection");

const dashboardSection =
    document.getElementById("dashboardSection");

const loginEmail =
    document.getElementById("loginEmail");

const loginPassword =
    document.getElementById("loginPassword");

const loginBtn =
    document.getElementById("loginBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const coachForm =
    document.getElementById("coachForm");

const recordId =
    document.getElementById("recordId");

const shop =
    document.getElementById("shop");

const coachNo =
    document.getElementById("coachNo");

const datePlaced =
    document.getElementById("datePlaced");

const dateIn =
    document.getElementById("dateIn");

const detentionDay =
    document.getElementById("detentionDay");

const status =
    document.getElementById("status");

const saveBtn =
    document.getElementById("saveBtn");

const resetBtn =
    document.getElementById("resetBtn");

const searchInput =
    document.getElementById("searchInput");

const shopFilter =
    document.getElementById("shopFilter");

const tableBody =
    document.getElementById("coachTableBody");

const message =
    document.getElementById("message");

const loginMessage =
    document.getElementById("loginMessage");


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let coachRecords = [];

let unsubscribeStock = null;

let loggedInUser = null;


/* =========================================================
   SAFE HTML
========================================================= */

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]
    );

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text, type = "success") {

    message.textContent = text;

    message.style.color =
        type === "error" ? "#c52b35" : "#16834b";

}



/* =========================================================
   FIXED FIREBASE LOGIN
========================================================= */

loginBtn.addEventListener("click", async (event) => {

    event.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        loginMessage.textContent = "Email and Password required";
        loginMessage.style.color = "red";
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "PLEASE WAIT...";

    try {

        const result = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        loginMessage.textContent =
            "LOGIN SUCCESS: " + result.user.email;

        loginMessage.style.color = "green";

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        loginMessage.textContent =
            error.code + " : " + error.message;

        loginMessage.style.color = "red";

    } finally {

        loginBtn.disabled = false;
        loginBtn.textContent = "LOGIN";

    }

});



/* =========================================================
   ENTER KEY LOGIN
========================================================= */

loginPassword.addEventListener("keydown", event => {

    if (event.key === "Enter") {
        loginBtn.click();
    }

});


/* =========================================================
   AUTHENTICATION STATUS
========================================================= */

window.addEventListener("coachStockAuth", event => {

    const authData = event.detail;

    if (authData.loggedIn) {

        loggedInUser = authData.user;

        showDashboard();

    } else {

        loggedInUser = null;

        showLogin();

    }

});


/* =========================================================
   SHOW DASHBOARD
========================================================= */

function showDashboard() {

    loginSection.style.display = "none";

    dashboardSection.style.display = "block";

    document.getElementById("userInfo").textContent =
        loggedInUser.email || loggedInUser.uid;

    document.getElementById("databaseStatus").textContent =
        "Firebase Connected";

    document.getElementById("databaseStatus").style.color =
        "green";

    startStockListener();

}


/* =========================================================
   SHOW LOGIN
========================================================= */

function showLogin() {

    loginSection.style.display = "block";

    dashboardSection.style.display = "none";

    coachRecords = [];

    if (unsubscribeStock) {

        unsubscribeStock();

        unsubscribeStock = null;

    }

}


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn.addEventListener("click", async () => {

    if (!confirm("Are you sure you want to logout?")) {
        return;
    }

    try {

        await signOut(auth);

    } catch (error) {

        alert("Logout Error: " + error.message);

    }

});


/* =========================================================
   REALTIME DATABASE LISTENER
========================================================= */

function startStockListener() {

    if (unsubscribeStock) {
        unsubscribeStock();
    }

    unsubscribeStock = listenCoachStock(

        records => {

            coachRecords = records;

            renderDashboard();

            document.getElementById(
                "databaseStatus"
            ).textContent = "Firebase Connected";

            document.getElementById(
                "offlineStatus"
            ).textContent = "";

        },

        error => {

            document.getElementById(
                "databaseStatus"
            ).textContent = "Database Error";

            document.getElementById(
                "offlineStatus"
            ).textContent = error.message;

        }

    );

}


/* =========================================================
   DETENTION DAY PREVIEW
========================================================= */

function updateDetentionPreview() {

    detentionDay.value = calculateDetentionDay(
        datePlaced.value,
        dateIn.value
    );

}

datePlaced.addEventListener(
    "change",
    updateDetentionPreview
);

dateIn.addEventListener(
    "change",
    updateDetentionPreview
);


/* =========================================================
   RESET FORM
========================================================= */

function resetForm() {

    coachForm.reset();

    recordId.value = "";

    detentionDay.value = "0";

    saveBtn.textContent = "SAVE COACH";

}

resetBtn.addEventListener("click", resetForm);


/* =========================================================
   SAVE / UPDATE COACH
========================================================= */

coachForm.addEventListener("submit", async event => {

    event.preventDefault();

    if (!loggedInUser) {
        showMessage("Please login first.", "error");
        return;
    }

    const data = {

        shop: shop.value,

        coachNo: coachNo.value.trim(),

        datePlaced: datePlaced.value,

        dateIn: dateIn.value,

        status: status.value

    };

    if (!data.shop || !data.coachNo || !data.datePlaced) {

        showMessage(
            "Shop, Coach No and Date Placed are required.",
            "error"
        );

        return;

    }

    if (data.dateIn && data.dateIn < data.datePlaced) {

        showMessage(
            "Date In cannot be earlier than Date Placed.",
            "error"
        );

        return;

    }

    // Duplicate coach number check

    const duplicate = coachRecords.find(item => {

        return (
            item.coachNo.toLowerCase() ===
            data.coachNo.toLowerCase() &&
            item.id !== recordId.value
        );

    });

    if (duplicate) {

        showMessage(
            "This Coach Number already exists.",
            "error"
        );

        return;

    }

    saveBtn.disabled = true;

    saveBtn.textContent = "SAVING...";

    try {

        if (recordId.value) {

            await updateCoach(recordId.value, data);

            showMessage("Coach Updated Successfully.");

        } else {

            await addCoach(data);

            showMessage("Coach Saved Successfully.");

        }

        resetForm();

    } catch (error) {

        showMessage(
            "Error: " + error.message,
            "error"
        );

    } finally {

        saveBtn.disabled = false;

        saveBtn.textContent = recordId.value
            ? "UPDATE COACH"
            : "SAVE COACH";

    }

});


/* =========================================================
   EDIT COACH
========================================================= */

function editCoach(id) {

    const record = coachRecords.find(
        item => item.id === id
    );

    if (!record) return;

    recordId.value = record.id;

    shop.value = record.shop || "";

    coachNo.value = record.coachNo || "";

    datePlaced.value = record.datePlaced || "";

    dateIn.value = record.dateIn || "";

    status.value = record.status || "";

    updateDetentionPreview();

    saveBtn.textContent = "UPDATE COACH";

    document.getElementById(
        "coachForm"
    ).scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* =========================================================
   DELETE COACH
========================================================= */

async function removeCoach(id) {

    const record = coachRecords.find(
        item => item.id === id
    );

    if (!record) return;

    if (!confirm(
        "Delete Coach " + record.coachNo + " ?"
    )) {
        return;
    }

    try {

        await deleteCoach(id);

        showMessage("Coach Deleted Successfully.");

        if (recordId.value === id) {
            resetForm();
        }

    } catch (error) {

        showMessage(
            "Delete Error: " + error.message,
            "error"
        );

    }

}


/* =========================================================
   TABLE RENDER
========================================================= */

function renderTable() {

    const keyword =
        searchInput.value.trim().toLowerCase();

    const selectedShop = shopFilter.value;

    const filtered = coachRecords.filter(item => {

        const matchesSearch = [

            item.shop,

            item.coachNo,

            item.status,

            item.datePlaced,

            item.dateIn

        ].some(value =>

            String(value || "")
                .toLowerCase()
                .includes(keyword)

        );

        const matchesShop =
            !selectedShop ||
            item.shop === selectedShop;

        return matchesSearch && matchesShop;

    });

    if (filtered.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    No Coach Records Found
                </td>
            </tr>
        `;

        return;

    }

    tableBody.innerHTML = filtered.map((item, index) => {

        const days = calculateDetentionDay(
            item.datePlaced,
            item.dateIn || ""
        );

        return `

            <tr>

                <td>${index + 1}</td>

                <td>${escapeHTML(item.shop)}</td>

                <td><b>${escapeHTML(item.coachNo)}</b></td>

                <td>${escapeHTML(item.datePlaced)}</td>

                <td>${escapeHTML(item.dateIn || "-")}</td>

                <td><b>${days}</b></td>

                <td class="status">
                    ${escapeHTML(item.status || "-")}
                </td>

                <td>

                    <button
                        class="btn-warning"
                        data-action="edit"
                        data-id="${escapeHTML(item.id)}">
                        EDIT
                    </button>

                    <button
                        class="btn-danger"
                        data-action="delete"
                        data-id="${escapeHTML(item.id)}">
                        DELETE
                    </button>

                </td>

            </tr>

        `;

    }).join("");

}


/* =========================================================
   TABLE BUTTON ACTIONS
========================================================= */

tableBody.addEventListener("click", event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "edit") {

        editCoach(id);

    }

    if (button.dataset.action === "delete") {

        removeCoach(id);

    }

});


/* =========================================================
   DASHBOARD SUMMARY
========================================================= */

function renderSummary() {

    const total = coachRecords.length;

    const active = coachRecords.filter(item => {

        return (
            !item.dateIn &&
            item.status !== "RETURNED"
        );

    });

    const returned = coachRecords.filter(item => {

        return (
            item.status === "RETURNED" ||
            !!item.dateIn
        );

    });

    const average = active.length

        ? Math.round(
            active.reduce((sum, item) => {

                return sum + calculateDetentionDay(
                    item.datePlaced,
                    ""
                );

            }, 0) / active.length
        )

        : 0;

    document.getElementById(
        "totalCoach"
    ).textContent = total;

    document.getElementById(
        "inShop"
    ).textContent = active.length;

    document.getElementById(
        "returnedCoach"
    ).textContent = returned.length;

    document.getElementById(
        "averageDetention"
    ).textContent = average;

}


/* =========================================================
   RENDER DASHBOARD
========================================================= */

function renderDashboard() {

    renderSummary();

    renderTable();

}


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
    "input",
    renderTable
);

shopFilter.addEventListener(
    "change",
    renderTable
);


/* =========================================================
   EXCEL CSV EXPORT
========================================================= */

document.getElementById(
    "exportBtn"
).addEventListener("click", () => {

    const keyword =
        searchInput.value.trim().toLowerCase();

    const selectedShop = shopFilter.value;

    const records = coachRecords.filter(item => {

        const matchesSearch = [

            item.shop,
            item.coachNo,
            item.status,
            item.datePlaced,
            item.dateIn

        ].some(value =>

            String(value || "")
                .toLowerCase()
                .includes(keyword)

        );

        return matchesSearch &&
            (!selectedShop || item.shop === selectedShop);

    });

    const headers = [

        "SL",
        "SHOP",
        "COACH NO",
        "DATE PLACED",
        "DATE IN",
        "DETENTION DAY",
        "STATUS"

    ];

    const rows = records.map((item, index) => [

        index + 1,

        item.shop,

        item.coachNo,

        item.datePlaced,

        item.dateIn || "",

        calculateDetentionDay(
            item.datePlaced,
            item.dateIn || ""
        ),

        item.status || ""

    ]);

    function csvCell(value) {

        let text = String(value ?? "");

        // Prevent spreadsheet formula injection

        if (/^[=+\-@\t\r]/.test(text)) {
            text = "'" + text;
        }

        return '"' + text.replace(/"/g, '""') + '"';

    }

    const csv = "\uFEFF" + [

        headers,

        ...rows

    ].map(row =>

        row.map(csvCell).join(",")

    ).join("\r\n");

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "MR_COACH_STOCK.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

});


/* =========================================================
   INITIALIZATION
========================================================= */

console.log(
    "MR COACH STOCK DASHBOARD VERSION 1.0 LOADED"
);
