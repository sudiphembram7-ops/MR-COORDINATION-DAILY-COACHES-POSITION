
/* =========================================================
   MR CO-ORDINATION DAILY COACH STOCK
   COACH-STOCK.JS
   VERSION 1.0 FINAL
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   PATH: coachStock/records

   REQUIRED FILES:
   coach-stock.html
   js/coach-stock.js
   js/firebase-config.js

   FIREBASE CONFIG EXPORTS:
   app, database, auth
========================================================= */

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    ref,
    push,
    set,
    update,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    auth,
    database
} from "./firebase-config.js";


/* =========================================================
   CONFIGURATION
========================================================= */

const DB_PATH = "coachStock/records";

const ADMIN_UID = "jHNrX5UaJla30nwGA48QHf87oaz2";

let currentUser = null;
let currentRole = "";
let coachRecords = {};
let activeMoveId = null;
let recordsLoaded = false;

const recordsRef = ref(database, DB_PATH);


/* =========================================================
   HTML ELEMENTS
========================================================= */

const $ = id => document.getElementById(id);

const loginSection = $("loginSection");
const appSection = $("appSection");

const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");

const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginMessage = $("loginMessage");

const userEmail = $("userEmail");
const message = $("message");

const coachForm = $("coachForm");
const editId = $("editId");

const coachNo = $("coachNo");
const coachCode = $("coachCode");
const shop = $("shop");
const workshopFirstInDate = $("workshopFirstInDate");
const status = $("status");
const remarks = $("remarks");

const saveBtn = $("saveBtn");
const resetBtn = $("resetBtn");

const stockTable = $("stockTable");
const searchInput = $("searchInput");
const shopFilter = $("shopFilter");

const moveShop = $("moveShop");
const moveDate = $("moveDate");
const moveStatus = $("moveStatus");
const moveRemarks = $("moveRemarks");
const confirmMoveBtn = $("confirmMoveBtn");


/* =========================================================
   DATE FUNCTIONS
========================================================= */

function todayDate() {

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

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}


function detentionDays(datePlaced, dateOut = "") {

    if (!datePlaced) return 0;

    const start = new Date(datePlaced + "T00:00:00");

    const end = new Date(
        (dateOut || todayDate()) + "T00:00:00"
    );

    const difference = Math.floor(
        (end - start) / 86400000
    );

    return Math.max(0, difference) + 1;
}


/* =========================================================
   SAFE HTML
========================================================= */

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => {

        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return map[char];

    });
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text, type = "success") {

    message.textContent = text;

    message.style.color =
        type === "error" ? "#bd3030" : "#16834a";

    setTimeout(() => {

        if (message.textContent === text) {
            message.textContent = "";
        }

    }, 5000);
}


/* =========================================================
   LOGIN
========================================================= */

loginBtn.addEventListener("click", async () => {

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {

        loginMessage.textContent =
            "Please enter Email and Password.";

        loginMessage.style.color = "red";
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

        loginMessage.textContent = "";

    } catch (error) {

        loginMessage.textContent = error.message;
        loginMessage.style.color = "red";

    } finally {

        loginBtn.disabled = false;
        loginBtn.textContent = "LOGIN";
    }

});


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn.addEventListener("click", async () => {

    try {

        await signOut(auth);

    } catch (error) {

        showMessage(error.message, "error");
    }

});


/* =========================================================
   AUTHENTICATION STATE
========================================================= */

onAuthStateChanged(auth, user => {

    currentUser = user;

    if (user) {

        currentRole =
            user.uid === ADMIN_UID ? "ADMIN" : "EDITOR";

        loginSection.style.display = "none";
        appSection.style.display = "block";

        userEmail.textContent =
            `${user.email} (${currentRole})`;

        startDatabaseListener();

    } else {

        currentRole = "";

        loginSection.style.display = "block";
        appSection.style.display = "none";

        coachRecords = {};
        recordsLoaded = false;

        stockTable.innerHTML =
            '<tr><td colspan="10">Please Login</td></tr>';

    }

});


/* =========================================================
   REALTIME DATABASE LISTENER
========================================================= */

let databaseListenerStarted = false;

function startDatabaseListener() {

    if (databaseListenerStarted) return;

    databaseListenerStarted = true;

    onValue(recordsRef, snapshot => {

        coachRecords = snapshot.val() || {};

        recordsLoaded = true;

        renderTable();
        updateDashboard();

    }, error => {

        showMessage(error.message, "error");

    });

}


/* =========================================================
   DASHBOARD COUNTERS
========================================================= */

function updateDashboard() {

    const records = Object.values(coachRecords);

    const total = records.length;

    const completed = records.filter(record => {

        return String(
            record.currentVisit?.status || ""
        ).toUpperCase() === "COMPLETED";

    }).length;

    $("totalCoaches").textContent = total;

    $("totalShops").textContent =
        new Set(records.map(r => r.currentShop).filter(Boolean)).size;

    $("completedCoaches").textContent = completed;

    $("pendingCoaches").textContent =
        total - completed;

}


/* =========================================================
   STOCK TABLE
========================================================= */

function renderTable() {

    if (!recordsLoaded) return;

    const keyword =
        searchInput.value.trim().toLowerCase();

    const selectedShop = shopFilter.value;

    const entries = Object.entries(coachRecords);

    const filtered = entries.filter(([id, record]) => {

        const visit = record.currentVisit || {};

        const searchable = [

            record.coachNo,
            record.coachCode,
            record.currentShop,
            visit.status,
            visit.remarks,
            record.workshopInDate

        ].join(" ").toLowerCase();

        const matchesSearch =
            searchable.includes(keyword);

        const matchesShop =
            !selectedShop ||
            record.currentShop === selectedShop;

        return matchesSearch && matchesShop;

    });

    filtered.sort((a, b) => {

        return (a[1].order || 0) - (b[1].order || 0);

    });

    if (!filtered.length) {

        stockTable.innerHTML = `
            <tr>
                <td colspan="10">No Coach Records Found</td>
            </tr>
        `;

        return;
    }

    stockTable.innerHTML = filtered.map(([id, record], index) => {

        const visit = record.currentVisit || {};

        const days = detentionDays(
            visit.datePlaced,
            visit.dateOut
        );

        const completed =
            String(visit.status || "").toUpperCase() === "COMPLETED";

        const statusHTML = visit.status
            ? `<span class="status ${completed ? "completed" : ""}">
                 ${escapeHTML(visit.status)}
               </span>`
            : "-";

        return `

        <tr>

            <td>${index + 1}</td>

            <td>${escapeHTML(record.currentShop || "-")}</td>

            <td>
                <button class="coach-link"
                    data-action="history"
                    data-id="${escapeHTML(id)}">
                    ${escapeHTML(record.coachNo)}
                </button>
            </td>

            <td>${escapeHTML(record.coachCode)}</td>

            <td>${formatDate(record.workshopInDate)}</td>

            <td>${formatDate(visit.datePlaced)}</td>

            <td>${formatDate(visit.dateOut)}</td>

            <td><strong>${days}</strong></td>

            <td>${statusHTML}</td>

            <td>
                <div class="actions">

                    <button class="btn-orange"
                        data-action="move"
                        data-id="${escapeHTML(id)}">
                        MOVE
                    </button>

                    <button class="btn-gray"
                        data-action="edit"
                        data-id="${escapeHTML(id)}">
                        EDIT
                    </button>

                    <button class="btn-red"
                        data-action="delete"
                        data-id="${escapeHTML(id)}"
                        ${currentRole !== "ADMIN" ? "disabled" : ""}>
                        DELETE
                    </button>

                </div>
            </td>

        </tr>

        `;

    }).join("");

}


/* =========================================================
   SEARCH AND SHOP FILTER
========================================================= */

searchInput.addEventListener("input", renderTable);

shopFilter.addEventListener("change", renderTable);


/* =========================================================
   SAVE NEW COACH / UPDATE COACH
========================================================= */

coachForm.addEventListener("submit", async event => {

    event.preventDefault();

    if (!currentUser) return;

    const number = coachNo.value.trim().toUpperCase();

    const type = coachCode.value;
    const selectedShop = shop.value;
    const firstDate = workshopFirstInDate.value;

    const coachStatus = status.value;
    const coachRemarks = remarks.value.trim();

    if (!number || !type || !selectedShop || !firstDate) {

        showMessage(
            "Please fill all required fields.",
            "error"
        );

        return;
    }

    const id = editId.value;

    // Duplicate Coach Number Protection

    const duplicate = Object.entries(coachRecords).find(
        ([recordId, record]) => {

            return recordId !== id &&
                String(record.coachNo).toUpperCase() === number;

        }
    );

    if (duplicate) {

        showMessage(
            "This Coach Number already exists!",
            "error"
        );

        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "SAVING...";

    try {

        if (id) {

            // UPDATE EXISTING COACH

            const oldRecord = coachRecords[id];

            if (!oldRecord) {
                throw new Error("Coach record not found.");
            }

            // Workshop In Date cannot be changed during editing.

            const oldVisit = oldRecord.currentVisit || {};

            const updatedRecord = {

                ...oldRecord,

                coachNo: number,
                coachCode: type,

                currentShop: oldRecord.currentShop,

                currentVisit: {

                    ...oldVisit,

                    status: coachStatus,
                    remarks: coachRemarks

                },

                updatedAt: Date.now(),
                updatedBy: currentUser.email

            };

            await update(
                ref(database, `${DB_PATH}/${id}`),
                updatedRecord
            );

            showMessage("Coach Updated Successfully.");

        } else {

            // FIRST ENTRY OF COACH

            const newRef = push(recordsRef);

            const newRecord = {

                coachNo: number,
                coachCode: type,

                workshopInDate: firstDate,

                currentShop: selectedShop,

                currentVisit: {

                    shop: selectedShop,

                    // First Date Placed = Workshop In Date
                    datePlaced: firstDate,

                    dateIn: firstDate,

                    dateOut: "",

                    status: coachStatus,
                    remarks: coachRemarks

                },

                // Movement history
                history: [],

                createdAt: Date.now(),
                createdBy: currentUser.email,

                updatedAt: Date.now(),
                updatedBy: currentUser.email,

                order: Date.now()

            };

            await set(newRef, newRecord);

            showMessage("New Coach Saved Successfully.");

        }

        resetForm();

    } catch (error) {

        showMessage(error.message, "error");

    } finally {

        saveBtn.disabled = false;
        saveBtn.textContent = "SAVE COACH";

    }

});


/* =========================================================
   EDIT COACH
========================================================= */

function editCoach(id) {

    const record = coachRecords[id];

    if (!record) return;

    const visit = record.currentVisit || {};

    editId.value = id;

    coachNo.value = record.coachNo || "";
    coachCode.value = record.coachCode || "";

    shop.value = record.currentShop || "";

    // Preserve original Workshop In Date
    workshopFirstInDate.value =
        record.workshopInDate || "";

    workshopFirstInDate.disabled = true;

    // Do not allow changing shop through EDIT
    shop.disabled = true;

    status.value = visit.status || "";
    remarks.value = visit.remarks || "";

    $("formTitle").textContent = "UPDATE COACH DETAILS";

    saveBtn.textContent = "UPDATE COACH";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   RESET FORM
========================================================= */

function resetForm() {

    coachForm.reset();

    editId.value = "";

    workshopFirstInDate.disabled = false;
    shop.disabled = false;

    $("formTitle").textContent = "ADD NEW COACH";

    saveBtn.textContent = "SAVE COACH";

}


resetBtn.addEventListener("click", resetForm);


/* =========================================================
   MOVE COACH MODAL
========================================================= */

function openMoveModal(id) {

    const record = coachRecords[id];

    if (!record) return;

    activeMoveId = id;

    const visit = record.currentVisit || {};

    $("moveCoachLabel").textContent =
        `Coach: ${record.coachNo} | Current Shop: ${record.currentShop}`;

    moveShop.value = "";

    moveDate.value = todayDate();

    moveStatus.value = visit.status || "";

    moveRemarks.value = visit.remarks || "";

    $("moveModal").style.display = "flex";

}


/* =========================================================
   CONFIRM COACH MOVEMENT
========================================================= */

confirmMoveBtn.addEventListener("click", async () => {

    if (!currentUser || !activeMoveId) return;

    const id = activeMoveId;

    const record = coachRecords[id];

    if (!record) return;

    const newShop = moveShop.value;
    const movementDate = moveDate.value;

    if (!newShop) {

        alert("Please Select New Shop.");
        return;
    }

    if (!movementDate) {

        alert("Movement Date is required.");
        return;
    }

    if (newShop === record.currentShop) {

        alert("Coach is already in this Shop.");
        return;
    }

    const oldVisit = record.currentVisit || {};

    // Movement date cannot be earlier than placement date.

    if (
        oldVisit.datePlaced &&
        movementDate < oldVisit.datePlaced
    ) {

        alert("Movement Date cannot be earlier than Date Placed.");
        return;
    }

    confirmMoveBtn.disabled = true;
    confirmMoveBtn.textContent = "MOVING...";

    try {

        const history = Array.isArray(record.history)
            ? [...record.history]
            : [];

        // SAVE PREVIOUS SHOP DETAILS

        history.push({

            shop: record.currentShop,

            datePlaced: oldVisit.datePlaced || "",

            dateIn: oldVisit.dateIn || "",

            dateOut: movementDate,

            movedToShop: newShop,

            status: oldVisit.status || "",

            remarks: oldVisit.remarks || "",

            movedAt: Date.now(),

            movedBy: currentUser.email

        });

        // CREATE NEW CURRENT SHOP VISIT

        const newRecord = {

            ...record,

            currentShop: newShop,

            currentVisit: {

                shop: newShop,

                datePlaced: movementDate,

                dateIn: "",

                dateOut: "",

                status: moveStatus.value,

                remarks: moveRemarks.value.trim()

            },

            history: history,

            updatedAt: Date.now(),
            updatedBy: currentUser.email

        };

        await update(
            ref(database, `${DB_PATH}/${id}`),
            newRecord
        );

        closeModal("moveModal");

        activeMoveId = null;

        showMessage(
            `Coach ${record.coachNo} moved successfully to ${newShop}.`
        );

    } catch (error) {

        showMessage(error.message, "error");

    } finally {

        confirmMoveBtn.disabled = false;
        confirmMoveBtn.textContent = "CONFIRM MOVE";

    }

});


/* =========================================================
   DELETE COACH
========================================================= */

async function deleteCoach(id) {

    if (currentRole !== "ADMIN") {

        alert("Only Admin can delete Coach records.");
        return;
    }

    const record = coachRecords[id];

    if (!record) return;

    const confirmDelete = confirm(

        `Are you sure you want to DELETE Coach ${record.coachNo}?`

    );

    if (!confirmDelete) return;

    try {

        await remove(
            ref(database, `${DB_PATH}/${id}`)
        );

        showMessage("Coach Deleted Successfully.");

        if (editId.value === id) {
            resetForm();
        }

    } catch (error) {

        showMessage(error.message, "error");

    }

}


/* =========================================================
   COACH DETAILS AND MOVEMENT HISTORY
========================================================= */

function showCoachHistory(id) {

    const record = coachRecords[id];

    if (!record) return;

    const visit = record.currentVisit || {};

    const history = Array.isArray(record.history)
        ? record.history
        : [];

    let html = `

        <h3 style="margin-bottom:12px">
            COACH ${escapeHTML(record.coachNo)}
        </h3>

        <div class="detail-grid">

            <div class="detail-item">
                <small>COACH NUMBER</small>
                <strong>${escapeHTML(record.coachNo)}</strong>
            </div>

            <div class="detail-item">
                <small>COACH TYPE</small>
                <strong>${escapeHTML(record.coachCode)}</strong>
            </div>

            <div class="detail-item">
                <small>WORKSHOP IN DATE</small>
                <strong>${formatDate(record.workshopInDate)}</strong>
            </div>

            <div class="detail-item">
                <small>CURRENT SHOP</small>
                <strong>${escapeHTML(record.currentShop)}</strong>
            </div>

            <div class="detail-item">
                <small>CURRENT DATE PLACED</small>
                <strong>${formatDate(visit.datePlaced)}</strong>
            </div>

            <div class="detail-item">
                <small>CURRENT DATE OUT</small>
                <strong>${formatDate(visit.dateOut)}</strong>
            </div>

            <div class="detail-item">
                <small>CURRENT DETENTION DAYS</small>
                <strong>${detentionDays(visit.datePlaced, visit.dateOut)}</strong>
            </div>

            <div class="detail-item">
                <small>STATUS</small>
                <strong>${escapeHTML(visit.status || "-")}</strong>
            </div>

            <div class="detail-item">
                <small>REMARKS</small>
                <strong>${escapeHTML(visit.remarks || "-")}</strong>
            </div>

        </div>

        <h3 style="margin:22px 0 12px">
            SHOP MOVEMENT HISTORY
        </h3>

    `;

    if (!history.length) {

        html += `
            <p class="note">
                No Previous Shop Movement.
            </p>
        `;

    } else {

        history.slice().reverse().forEach((item, index) => {

            const days = detentionDays(
                item.datePlaced,
                item.dateOut
            );

            html += `

                <div class="history-item">

                    <strong>
                        ${history.length - index}. 
                        ${escapeHTML(item.shop || "-")}
                    </strong>

                    <p>
                        Date Placed:
                        ${formatDate(item.datePlaced)}
                    </p>

                    <p>
                        Date Out:
                        ${formatDate(item.dateOut)}
                    </p>

                    <p>
                        Detention Days:
                        <strong>${days}</strong>
                    </p>

                    <p>
                        Moved To:
                        <strong>${escapeHTML(item.movedToShop || "-")}</strong>
                    </p>

                    <p>
                        Status:
                        ${escapeHTML(item.status || "-")}
                    </p>

                    <p>
                        Remarks:
                        ${escapeHTML(item.remarks || "-")}
                    </p>

                </div>

            `;

        });

    }

    $("historyContent").innerHTML = html;

    $("historyModal").style.display = "flex";

}


/* =========================================================
   TABLE ACTION HANDLER
========================================================= */

stockTable.addEventListener("click", event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {

        editCoach(id);

    }

    else if (action === "move") {

        openMoveModal(id);

    }

    else if (action === "delete") {

        deleteCoach(id);

    }

    else if (action === "history") {

        showCoachHistory(id);

    }

});


/* =========================================================
   INITIAL DATE
========================================================= */

workshopFirstInDate.value = todayDate();

moveDate.value = todayDate();


/* =========================================================
   END OF COACH-STOCK.JS
   VERSION 1.0 FINAL
========================================================= */
