
/* =========================================================
   MR COACH STOCK DASHBOARD
   COACH-STOCK.JS
   VERSION 3.0 FINAL
   ---------------------------------------------------------
   MATCHED WITH:
   coach-stock.html V3.0
   firebase-coach-stock.js V3.0
   firebase-config.js V12.0

   FEATURES:
   ✔ Firebase Admin Login
   ✔ Add / Edit / Delete Coach
   ✔ Move Coach Between Shops
   ✔ Automatic Date Placed
   ✔ Automatic Date Out
   ✔ Automatic Detention Day
   ✔ Permanent Workshop In Date
   ✔ Coach Details & Previous Shop History
   ✔ Search / Shop Filter
   ✔ Realtime Firebase Update
   ✔ No Date In Field
========================================================= */

import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    calculateDetentionDay,
    listenCoachStock,
    addCoach,
    updateCoach,
    moveCoach,
    deleteCoach,
    getCoach
} from "./firebase-coach-stock.js";


/* =========================================================
   ELEMENTS
========================================================= */

const $ = id => document.getElementById(id);

const loginSection = $("loginSection");
const appSection = $("appSection");

const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginBtn = $("loginBtn");
const loginMessage = $("loginMessage");

const userEmail = $("userEmail");
const logoutBtn = $("logoutBtn");

const message = $("message");

const coachForm = $("coachForm");
const formTitle = $("formTitle");
const editId = $("editId");

const coachNo = $("coachNo");
const coachCode = $("coachCode");
const shop = $("shop");
const workshopFirstInDate = $("workshopFirstInDate");
const status = $("status");
const remarks = $("remarks");

const saveBtn = $("saveBtn");
const resetBtn = $("resetBtn");

const searchInput = $("searchInput");
const shopFilter = $("shopFilter");
const stockTable = $("stockTable");

const moveModal = $("moveModal");
const moveCoachLabel = $("moveCoachLabel");
const moveShop = $("moveShop");
const moveDate = $("moveDate");
const moveStatus = $("moveStatus");
const moveRemarks = $("moveRemarks");
const confirmMoveBtn = $("confirmMoveBtn");

const historyModal = $("historyModal");
const historyContent = $("historyContent");

const totalCoaches = $("totalCoaches");
const totalShops = $("totalShops");
const pendingCoaches = $("pendingCoaches");
const completedCoaches = $("completedCoaches");


/* =========================================================
   STATE
========================================================= */

let coaches = [];
let unsubscribeStock = null;
let selectedMoveId = null;
let busy = false;

const SHOP_COUNT = 18;


/* =========================================================
   DATE FUNCTIONS
========================================================= */

function today() {
    const d = new Date();

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(value) {
    if (!value) return "-";

    const parts = String(value).split("-");

    if (parts.length !== 3) return value;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDays(datePlaced, dateOut = "") {
    if (!datePlaced) return 0;

    return calculateDetentionDay(
        datePlaced,
        dateOut || ""
    );
}


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text, type = "success") {
    if (!message) return;

    message.textContent = text;

    message.style.color =
        type === "error" ? "#b91c1c" : "#15803d";

    message.style.display = "block";

    setTimeout(() => {
        message.style.display = "none";
    }, 4000);
}

function showLoginMessage(text, type = "error") {
    if (!loginMessage) return;

    loginMessage.textContent = text;

    loginMessage.style.color =
        type === "success" ? "#15803d" : "#b91c1c";
}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setBusy(value, button = saveBtn) {
    busy = value;

    if (button) {
        button.disabled = value;
    }
}


/* =========================================================
   RESET FORM
========================================================= */

function resetForm() {
    coachForm.reset();

    editId.value = "";

    formTitle.textContent = "ADD NEW COACH";
    saveBtn.textContent = "SAVE COACH";

    workshopFirstInDate.disabled = false;
    shop.disabled = false;

    workshopFirstInDate.value = today();

    status.value = "";
    remarks.value = "";
}


/* =========================================================
   LOGIN
========================================================= */

loginBtn.addEventListener("click", async () => {

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        showLoginMessage("Enter Email and Password");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "LOGGING IN...";

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        showLoginMessage("Login Successful", "success");

    } catch (error) {

        console.error("Login Error:", error);

        showLoginMessage(
            error.message || "Login Failed"
        );

    } finally {

        loginBtn.disabled = false;
        loginBtn.textContent = "LOGIN";
    }
});


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
        console.error(error);
        showMessage("Logout Failed", "error");
    }
});


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, user => {

    if (user) {

        loginSection.style.display = "none";
        appSection.style.display = "block";

        userEmail.textContent = user.email || "Logged In";

        resetForm();
        startRealtimeListener();

    } else {

        if (unsubscribeStock) {
            unsubscribeStock();
            unsubscribeStock = null;
        }

        coaches = [];

        loginSection.style.display = "block";
        appSection.style.display = "none";

        renderTable();
        updateCounters();
    }
});


/* =========================================================
   FIREBASE REALTIME LISTENER
========================================================= */

function startRealtimeListener() {

    if (unsubscribeStock) {
        unsubscribeStock();
    }

    unsubscribeStock = listenCoachStock(

        data => {

            coaches = Object.entries(data || {}).map(
                ([id, record]) => ({
                    id,
                    ...record
                })
            );

            renderTable();
            updateCounters();

        },

        error => {

            console.error("Realtime Error:", error);

            showMessage(
                "Database connection error",
                "error"
            );
        }
    );
}


/* =========================================================
   ADD / UPDATE COACH
========================================================= */

coachForm.addEventListener("submit", async event => {

    event.preventDefault();

    if (busy) return;

    const id = editId.value.trim();

    const data = {
        coachNo: coachNo.value.trim().toUpperCase(),
        coachCode: coachCode.value.trim().toUpperCase(),
        shop: shop.value,
        workshopFirstInDate: id
            ? (coaches.find(c => c.id === id)?.workshopFirstInDate || "")
            : workshopFirstInDate.value,
        status: status.value,
        remarks: remarks.value.trim()
    };

    if (!data.coachNo || !data.coachCode || !data.shop) {
        showMessage("Please fill all required fields", "error");
        return;
    }

    if (!id && !data.workshopFirstInDate) {
        showMessage("Workshop In Date is required", "error");
        return;
    }

    setBusy(true);

    try {

        if (id) {

            await updateCoach(id, data);

            showMessage("Coach Updated Successfully");

        } else {

            await addCoach(data);

            showMessage("Coach Added Successfully");
        }

        resetForm();

    } catch (error) {

        console.error("Save Error:", error);

        showMessage(
            error.message || "Unable to save coach",
            "error"
        );

    } finally {

        setBusy(false);
    }
});


/* =========================================================
   RESET BUTTON
========================================================= */

resetBtn.addEventListener("click", () => {
    resetForm();
});


/* =========================================================
   EDIT COACH
========================================================= */

function editCoach(id) {

    const record = coaches.find(c => c.id === id);

    if (!record) {
        showMessage("Coach not found", "error");
        return;
    }

    editId.value = id;

    coachNo.value = record.coachNo || "";
    coachCode.value = record.coachCode || "";

    shop.value = record.currentShop || "";

    workshopFirstInDate.value =
        record.workshopFirstInDate || "";

    status.value =
        record.currentVisit?.status || "";

    remarks.value =
        record.currentVisit?.remarks || "";

    workshopFirstInDate.disabled = true;
    shop.disabled = true;

    formTitle.textContent = "EDIT COACH DETAILS";
    saveBtn.textContent = "UPDATE COACH";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   MOVE MODAL
========================================================= */

function openMoveModal(id) {

    const record = coaches.find(c => c.id === id);

    if (!record) return;

    selectedMoveId = id;

    moveCoachLabel.textContent =
        `${record.coachNo || ""} - ${record.currentShop || ""}`;

    moveDate.value = today();

    moveShop.value = "";
    moveStatus.value = record.currentVisit?.status || "";
    moveRemarks.value = "";

    moveModal.style.display = "flex";
}

function closeMoveModal() {

    moveModal.style.display = "none";
    selectedMoveId = null;
}


/* =========================================================
   CONFIRM MOVE
========================================================= */

confirmMoveBtn.addEventListener("click", async () => {

    if (!selectedMoveId || busy) return;

    const newShop = moveShop.value;

    if (!newShop) {
        showMessage("Please select new shop", "error");
        return;
    }

    const record = coaches.find(
        c => c.id === selectedMoveId
    );

    if (record && record.currentShop === newShop) {
        showMessage("Coach is already in this shop", "error");
        return;
    }

    const moveData = {
        shop: newShop,
        status: moveStatus.value,
        remarks: moveRemarks.value.trim()
    };

    setBusy(true, confirmMoveBtn);

    try {

        await moveCoach(selectedMoveId, moveData);

        closeMoveModal();

        showMessage(
            "Coach Moved Successfully. Date Out and Date Placed Updated."
        );

    } catch (error) {

        console.error("Move Error:", error);

        showMessage(
            error.message || "Coach Move Failed",
            "error"
        );

    } finally {

        setBusy(false, confirmMoveBtn);
    }
});


/* =========================================================
   DELETE COACH
========================================================= */

async function removeCoach(id) {

    const record = coaches.find(c => c.id === id);

    if (!record) return;

    const confirmed = confirm(
        `Delete Coach ${record.coachNo}?\n\n` +
        "This will permanently delete the coach record " +
        "and its complete shop history."
    );

    if (!confirmed) return;

    try {

        await deleteCoach(id);

        showMessage("Coach and History Deleted Successfully");

    } catch (error) {

        console.error("Delete Error:", error);

        showMessage(
            error.message || "Delete Failed",
            "error"
        );
    }
}


/* =========================================================
   COACH HISTORY / DETAILS
========================================================= */

async function showCoachHistory(id) {

    let record = coaches.find(c => c.id === id);

    if (!record) return;

    try {

        const latestRecord = await getCoach(id);

        if (latestRecord) {
            record = latestRecord;
        }

    } catch (error) {

        console.warn("Could not refresh coach details:", error);
    }

    const history = Array.isArray(record.history)
        ? record.history
        : Object.values(record.history || {});

    const current = record.currentVisit || {};

    let html = `
        <h2>COACH DETAILS</h2>

        <div class="history-details">
            <p><b>Coach No:</b> ${escapeHTML(record.coachNo)}</p>
            <p><b>Coach Type:</b> ${escapeHTML(record.coachCode)}</p>
            <p><b>Current Shop:</b> ${escapeHTML(record.currentShop)}</p>
            <p><b>Workshop In Date:</b>
                ${formatDate(record.workshopFirstInDate)}
            </p>
            <p><b>Current Date Placed:</b>
                ${formatDate(current.datePlaced)}
            </p>
            <p><b>Status:</b> ${escapeHTML(current.status || "-")}</p>
            <p><b>Remarks:</b> ${escapeHTML(current.remarks || "-")}</p>
        </div>

        <hr>

        <h3>PREVIOUS SHOP HISTORY</h3>

        <div class="history-table-wrap">
        <table class="history-table">
            <thead>
                <tr>
                    <th>SL</th>
                    <th>SHOP</th>
                    <th>DATE PLACED</th>
                    <th>DATE OUT</th>
                    <th>DETENTION DAY</th>
                    <th>STATUS</th>
                    <th>REMARKS</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (history.length === 0) {

        html += `
            <tr>
                <td colspan="7">No Previous Shop History</td>
            </tr>
        `;

    } else {

        history.forEach((visit, index) => {

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHTML(visit.shop || "-")}</td>
                    <td>${formatDate(visit.datePlaced)}</td>
                    <td>${formatDate(visit.dateOut)}</td>
                    <td>${getDays(visit.datePlaced, visit.dateOut)}</td>
                    <td>${escapeHTML(visit.status || "-")}</td>
                    <td>${escapeHTML(visit.remarks || "-")}</td>
                </tr>
            `;
        });
    }

    html += `
            </tbody>
        </table>
        </div>
    `;

    historyContent.innerHTML = html;

    historyModal.style.display = "flex";
}


/* =========================================================
   CLOSE MODALS
========================================================= */

window.closeModal = function (modalId) {

    const modal = $(modalId);

    if (modal) {
        modal.style.display = "none";
    }

    if (modalId === "moveModal") {
        selectedMoveId = null;
    }
};

window.closeMoveModal = closeMoveModal;

[moveModal, historyModal].forEach(modal => {

    if (!modal) return;

    modal.addEventListener("click", event => {

        if (event.target === modal) {
            window.closeModal(modal.id);
        }
    });
});


/* =========================================================
   TABLE RENDER
========================================================= */

function renderTable() {

    if (!stockTable) return;

    const keyword =
        (searchInput?.value || "").trim().toLowerCase();

    const selectedShop =
        shopFilter?.value || "";

    const filtered = coaches.filter(record => {

        const current = record.currentVisit || {};

        const searchText = [
            record.coachNo,
            record.coachCode,
            record.currentShop,
            current.status,
            current.remarks,
            record.workshopFirstInDate
        ].join(" ").toLowerCase();

        const matchSearch =
            !keyword || searchText.includes(keyword);

        const matchShop =
            !selectedShop ||
            record.currentShop === selectedShop;

        return matchSearch && matchShop;
    });

    if (filtered.length === 0) {

        stockTable.innerHTML = `
            <tr>
                <td colspan="10">No Coach Records Found</td>
            </tr>
        `;

        return;
    }

    stockTable.innerHTML = filtered.map((record, index) => {

        const current = record.currentVisit || {};

        const datePlaced = current.datePlaced || "";
        const dateOut = current.dateOut || "";

        const detention = getDays(
            datePlaced,
            dateOut
        );

        return `
            <tr>
                <td>${index + 1}</td>

                <td>${escapeHTML(record.currentShop || "-")}</td>

                <td>
                    <button
                        type="button"
                        class="coach-link"
                        data-action="history"
                        data-id="${escapeHTML(record.id)}">
                        ${escapeHTML(record.coachNo || "-")}
                    </button>
                </td>

                <td>${escapeHTML(record.coachCode || "-")}</td>

                <td>${formatDate(record.workshopFirstInDate)}</td>

                <td>${formatDate(datePlaced)}</td>

                <td>${formatDate(dateOut)}</td>

                <td>${detention}</td>

                <td>${escapeHTML(current.status || "-")}</td>

                <td>
                    <button type="button"
                        data-action="edit"
                        data-id="${escapeHTML(record.id)}">
                        EDIT
                    </button>

                    <button type="button"
                        data-action="move"
                        data-id="${escapeHTML(record.id)}">
                        MOVE
                    </button>

                    <button type="button"
                        data-action="delete"
                        data-id="${escapeHTML(record.id)}">
                        DELETE
                    </button>
                </td>
            </tr>
        `;

    }).join("");
}


/* =========================================================
   TABLE ACTIONS
========================================================= */

stockTable.addEventListener("click", event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "history") {
        showCoachHistory(id);
    }

    if (action === "edit") {
        editCoach(id);
    }

    if (action === "move") {
        openMoveModal(id);
    }

    if (action === "delete") {
        removeCoach(id);
    }
});


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener("input", renderTable);

shopFilter.addEventListener("change", renderTable);


/* =========================================================
   DASHBOARD COUNTERS
========================================================= */

function updateCounters() {

    if (totalCoaches) {
        totalCoaches.textContent = coaches.length;
    }

    if (totalShops) {
        totalShops.textContent = SHOP_COUNT;
    }

    const completed = coaches.filter(record => {

        const value = String(
            record.currentVisit?.status || ""
        ).toLowerCase();

        return value.includes("complete") ||
               value.includes("completed");
    }).length;

    const pending = coaches.length - completed;

    if (completedCoaches) {
        completedCoaches.textContent = completed;
    }

    if (pendingCoaches) {
        pendingCoaches.textContent = pending;
    }
}


/* =========================================================
   INITIAL DATE
========================================================= */

if (workshopFirstInDate) {
    workshopFirstInDate.value = today();
}

if (moveDate) {
    moveDate.value = today();
}

console.log("MR COACH STOCK DASHBOARD V3.0 LOADED");
