
/* =========================================================
   MR CO-ORDINATION COACH STOCK
   COACH-STOCK.JS
   VERSION 2.0 FINAL

   MATCHED WITH:
   Coach-stock.html
   firebase-config.js V12
   firebase-coach-stock.js V2.0
========================================================= */

import { auth } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    listenCoachStock,
    addCoach,
    updateCoach,
    moveCoach,
    deleteCoach,
    calculateDetentionDay
} from "./firebase-coach-stock.js";


/* =========================================================
   ELEMENTS
========================================================= */

const $ = id => document.getElementById(id);

const loginSection = $("loginSection");
const appSection = $("appSection");

let coachRecords = [];
let unsubscribeStock = null;
let selectedMoveId = null;


/* =========================================================
   HELPERS
========================================================= */

function today() {
    const d = new Date();

    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0")
    ].join("-");
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showMessage(message, isError = false) {
    const el = $("message");

    if (!el) return;

    el.textContent = message;
    el.style.color = isError ? "#bd3030" : "#16834a";
}

function showLoginMessage(message, isError = true) {
    const el = $("loginMessage");

    if (!el) return;

    el.textContent = message;
    el.style.color = isError ? "#bd3030" : "#16834a";
}

function openModal(id) {
    const modal = $(id);

    if (modal) {
        modal.style.display = "flex";
    }
}

window.closeModal = function(id) {
    const modal = $(id);

    if (modal) {
        modal.style.display = "none";
    }
};

function formatDate(value) {
    if (!value) return "-";

    const parts = String(value).split("-");

    if (parts.length !== 3) return value;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getVisit(record) {
    return record.currentVisit || {};
}

function getFirstInDate(record) {
    const visit = getVisit(record);

    return record.workshopFirstInDate ||
        visit.dateIn ||
        visit.datePlaced ||
        "";
}


/* =========================================================
   AUTH LOGIN
========================================================= */

$("loginBtn").addEventListener("click", async () => {

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    if (!email || !password) {
        showLoginMessage("Please enter email and password.");
        return;
    }

    $("loginBtn").disabled = true;
    $("loginBtn").textContent = "LOGGING IN...";

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        showLoginMessage("Login successful.", false);

    } catch (error) {

        console.error("Login error:", error);

        showLoginMessage(
            error.message || "Login failed. Check your credentials."
        );

    } finally {

        $("loginBtn").disabled = false;
        $("loginBtn").textContent = "LOGIN";
    }
});


/* =========================================================
   ENTER KEY LOGIN
========================================================= */

$("loginPassword").addEventListener("keydown", event => {

    if (event.key === "Enter") {
        $("loginBtn").click();
    }
});


/* =========================================================
   LOGOUT
========================================================= */

$("logoutBtn").addEventListener("click", async () => {

    try {

        await signOut(auth);

    } catch (error) {

        console.error(error);
        showMessage(error.message, true);
    }
});


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, user => {

    if (unsubscribeStock) {
        unsubscribeStock();
        unsubscribeStock = null;
    }

    if (user) {

        loginSection.style.display = "none";
        appSection.style.display = "block";

        $("userEmail").textContent = user.email || "Logged in";

        showMessage("Connected to Coach Stock Database.");

        startStockListener();

    } else {

        loginSection.style.display = "block";
        appSection.style.display = "none";

        $("userEmail").textContent = "";

        coachRecords = [];
        renderTable([]);
        updateDashboard([]);

    }
});


/* =========================================================
   REALTIME DATABASE LISTENER
========================================================= */

function startStockListener() {

    unsubscribeStock = listenCoachStock(
        records => {

            coachRecords = records;

            renderTable(records);
            updateDashboard(records);

        },
        error => {

            showMessage(
                "Database error: " + error.message,
                true
            );

        }
    );
}


/* =========================================================
   DASHBOARD COUNTERS
========================================================= */

function updateDashboard(records) {

    $("totalCoaches").textContent = records.length;

    const shops = new Set(
        records.map(record =>
            record.currentShop || record.currentVisit?.shop
        ).filter(Boolean)
    );

    $("totalShops").textContent = 15;

    const completed = records.filter(record =>
        getVisit(record).status === "Completed"
    ).length;

    $("completedCoaches").textContent = completed;

    $("pendingCoaches").textContent =
        records.length - completed;
}


/* =========================================================
   TABLE FILTER
========================================================= */

$("searchInput").addEventListener("input", applyFilters);

$("shopFilter").addEventListener("change", applyFilters);

function applyFilters() {

    const keyword = $("searchInput").value
        .trim()
        .toLowerCase();

    const selectedShop = $("shopFilter").value;

    const filtered = coachRecords.filter(record => {

        const visit = getVisit(record);

        const searchText = [

            record.coachNo,
            record.coachCode,
            record.currentShop,
            visit.shop,
            visit.status,
            visit.remarks

        ].join(" ").toLowerCase();

        const matchesSearch = searchText.includes(keyword);

        const matchesShop = !selectedShop ||
            (record.currentShop || visit.shop) === selectedShop;

        return matchesSearch && matchesShop;
    });

    renderTable(filtered);
}


/* =========================================================
   RENDER STOCK TABLE
========================================================= */

function renderTable(records) {

    const tbody = $("stockTable");

    if (!tbody) return;

    if (!records || records.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="11">No Coach Records Found</td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = records.map((record, index) => {

        const visit = getVisit(record);

        const firstIn = getFirstInDate(record);

        const detention = calculateDetentionDay(
            visit.datePlaced || "",
            visit.dateOut || ""
        );

        const status = visit.status || "Pending";

        const statusClass = status === "Completed"
            ? "status completed"
            : "status";

        return `
        <tr>

            <td>${index + 1}</td>

            <td>${escapeHTML(record.currentShop || visit.shop || "-")}</td>

            <td>
                <button
                    type="button"
                    class="coach-link"
                    data-action="details"
                    data-id="${escapeHTML(record.id)}">
                    ${escapeHTML(record.coachNo)}
                </button>
            </td>

            <td>${escapeHTML(record.coachCode || "-")}</td>

            <td>${formatDate(firstIn)}</td>

            <td>${formatDate(visit.datePlaced)}</td>

            <td>${formatDate(visit.dateIn)}</td>

            <td>${formatDate(visit.dateOut)}</td>

            <td><strong>${detention}</strong></td>

            <td>
                <span class="${statusClass}">
                    ${escapeHTML(status)}
                </span>
            </td>

            <td>
                <div class="actions">

                    <button
                        type="button"
                        class="btn-orange"
                        data-action="move"
                        data-id="${escapeHTML(record.id)}">
                        MOVE
                    </button>

                    <button
                        type="button"
                        data-action="edit"
                        data-id="${escapeHTML(record.id)}">
                        EDIT
                    </button>

                    <button
                        type="button"
                        class="btn-red"
                        data-action="delete"
                        data-id="${escapeHTML(record.id)}">
                        DELETE
                    </button>

                </div>
            </td>

        </tr>
        `;

    }).join("");
}


/* =========================================================
   TABLE ACTIONS
========================================================= */

$("stockTable").addEventListener("click", async event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    const record = coachRecords.find(item => item.id === id);

    if (!record) {
        showMessage("Coach record not found.", true);
        return;
    }

    if (action === "details") {
        showCoachDetails(record);
    }

    if (action === "edit") {
        editCoachForm(record);
    }

    if (action === "move") {
        openMoveForm(record);
    }

    if (action === "delete") {
        await deleteCoachRecord(record);
    }
});


/* =========================================================
   ADD / UPDATE FORM
========================================================= */

$("coachForm").addEventListener("submit", async event => {

    event.preventDefault();

    const id = $("editId").value;

    const data = {

        coachNo: $("coachNo").value.trim(),

        coachCode: $("coachCode").value,

        shop: $("shop").value,

        workshopFirstInDate: $("workshopFirstInDate").value,

        datePlaced: $("datePlaced").value,

        dateIn: $("dateIn").value,

        status: $("status").value,

        remarks: $("remarks").value.trim()
    };

    if (!data.coachNo ||
        !data.coachCode ||
        !data.shop ||
        !data.workshopFirstInDate ||
        !data.datePlaced) {

        showMessage("Please fill all required fields.", true);
        return;
    }

    $("saveBtn").disabled = true;
    $("saveBtn").textContent = "SAVING...";

    try {

        if (id) {

            await updateCoach(id, data);

            showMessage("Coach updated successfully.");

        } else {

            await addCoach(data);

            showMessage("New Coach saved successfully.");
        }

        resetForm();

    } catch (error) {

        console.error(error);

        showMessage(error.message || "Save failed.", true);

    } finally {

        $("saveBtn").disabled = false;

        $("saveBtn").textContent = "SAVE COACH";
    }
});


/* =========================================================
   EDIT COACH FORM
========================================================= */

function editCoachForm(record) {

    const visit = getVisit(record);

    $("editId").value = record.id;

    $("coachNo").value = record.coachNo || "";

    $("coachCode").value = record.coachCode || "";

    $("shop").value = record.currentShop || visit.shop || "";

    $("workshopFirstInDate").value =
        getFirstInDate(record);

    $("datePlaced").value = visit.datePlaced || "";

    $("dateIn").value = visit.dateIn || "";

    $("status").value = visit.status || "Pending";

    $("remarks").value = visit.remarks || "";

    $("formTitle").textContent = "UPDATE COACH";

    $("saveBtn").textContent = "UPDATE COACH";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   RESET FORM
========================================================= */

function resetForm() {

    $("coachForm").reset();

    $("editId").value = "";

    $("formTitle").textContent = "ADD NEW COACH";

    $("saveBtn").textContent = "SAVE COACH";

}

$("resetBtn").addEventListener("click", resetForm);


/* =========================================================
   DELETE COACH
========================================================= */

async function deleteCoachRecord(record) {

    const confirmed = confirm(
        `Delete Coach ${record.coachNo}?\n\nThis will delete the complete record and its history.`
    );

    if (!confirmed) return;

    try {

        await deleteCoach(record.id);

        showMessage("Coach deleted successfully.");

    } catch (error) {

        console.error(error);

        showMessage(error.message || "Delete failed.", true);
    }
}


/* =========================================================
   OPEN MOVE MODAL
========================================================= */

function openMoveForm(record) {

    selectedMoveId = record.id;

    const visit = getVisit(record);

    $("moveCoachLabel").textContent =
        `Coach: ${record.coachNo} | Current Shop: ${record.currentShop || visit.shop}`;

    $("moveShop").value = "";

    $("moveDate").value = today();

    $("moveDateIn").value = "";

    $("moveStatus").value = "Pending";

    $("moveRemarks").value = "";

    openModal("moveModal");
}


/* =========================================================
   CONFIRM COACH MOVEMENT
========================================================= */

$("confirmMoveBtn").addEventListener("click", async () => {

    if (!selectedMoveId) {
        showMessage("No Coach selected for movement.", true);
        return;
    }

    const data = {

        shop: $("moveShop").value,

        date: $("moveDate").value,

        dateIn: $("moveDateIn").value,

        status: $("moveStatus").value,

        remarks: $("moveRemarks").value.trim()
    };

    if (!data.shop) {

        alert("Please select the new shop.");
        return;
    }

    const record = coachRecords.find(
        item => item.id === selectedMoveId
    );

    if (record &&
        data.shop === (record.currentShop || getVisit(record).shop)) {

        alert("Coach is already in this shop.");
        return;
    }

    const confirmed = confirm(
        `Confirm Coach Movement?\n\nCoach: ${record?.coachNo || ""}\nNew Shop: ${data.shop}\nMovement Date: ${data.date}`
    );

    if (!confirmed) return;

    $("confirmMoveBtn").disabled = true;
    $("confirmMoveBtn").textContent = "MOVING...";

    try {

        await moveCoach(selectedMoveId, data);

        showMessage(
            "Coach moved successfully. Previous shop visit saved in history."
        );

        closeModal("moveModal");

        selectedMoveId = null;

    } catch (error) {

        console.error(error);

        alert(error.message || "Coach movement failed.");

    } finally {

        $("confirmMoveBtn").disabled = false;
        $("confirmMoveBtn").textContent = "CONFIRM MOVE";
    }
});


/* =========================================================
   COACH DETAILS + HISTORY POPUP
========================================================= */

function showCoachDetails(record) {

    const visit = getVisit(record);

    const history = Array.isArray(record.history)
        ? record.history
        : [];

    const firstIn = getFirstInDate(record);

    const detention = calculateDetentionDay(
        visit.datePlaced || "",
        visit.dateOut || ""
    );

    let historyHTML = "";

    if (history.length === 0) {

        historyHTML = `
            <p>No Previous Shop History Available.</p>
        `;

    } else {

        historyHTML = history.slice().reverse().map((item, index) => {

            const days = calculateDetentionDay(
                item.datePlaced || "",
                item.dateOut || ""
            );

            return `
                <div class="history-item">

                    <strong>Previous Visit ${history.length - index}</strong>

                    <div class="detail-grid" style="margin-top:10px">

                        <div class="detail-item">
                            <small>SHOP</small>
                            ${escapeHTML(item.shop || "-")}
                        </div>

                        <div class="detail-item">
                            <small>DATE PLACED</small>
                            ${formatDate(item.datePlaced)}
                        </div>

                        <div class="detail-item">
                            <small>DATE IN</small>
                            ${formatDate(item.dateIn)}
                        </div>

                        <div class="detail-item">
                            <small>DATE OUT</small>
                            ${formatDate(item.dateOut)}
                        </div>

                        <div class="detail-item">
                            <small>DETENTION DAY</small>
                            ${days}
                        </div>

                        <div class="detail-item">
                            <small>STATUS</small>
                            ${escapeHTML(item.status || "-")}
                        </div>

                        <div class="detail-item">
                            <small>MOVED TO</small>
                            ${escapeHTML(item.movedToShop || "-")}
                        </div>

                        <div class="detail-item">
                            <small>REMARKS</small>
                            ${escapeHTML(item.remarks || "-")}
                        </div>

                    </div>
                </div>
            `;

        }).join("");
    }

    $("historyContent").innerHTML = `

        <h3 style="margin-bottom:12px">
            COACH: ${escapeHTML(record.coachNo)}
        </h3>

        <div class="detail-grid">

            <div class="detail-item">
                <small>COACH TYPE</small>
                ${escapeHTML(record.coachCode || "-")}
            </div>

            <div class="detail-item">
                <small>CURRENT SHOP</small>
                ${escapeHTML(record.currentShop || visit.shop || "-")}
            </div>

            <div class="detail-item">
                <small>WORKSHOP 1ST IN DATE</small>
                ${formatDate(firstIn)}
            </div>

            <div class="detail-item">
                <small>DATE PLACED</small>
                ${formatDate(visit.datePlaced)}
            </div>

            <div class="detail-item">
                <small>DATE IN</small>
                ${formatDate(visit.dateIn)}
            </div>

            <div class="detail-item">
                <small>DATE OUT</small>
                ${formatDate(visit.dateOut)}
            </div>

            <div class="detail-item">
                <small>DETENTION DAY</small>
                ${detention}
            </div>

            <div class="detail-item">
                <small>STATUS</small>
                ${escapeHTML(visit.status || "-")}
            </div>

            <div class="detail-item">
                <small>REMARKS</small>
                ${escapeHTML(visit.remarks || "-")}
            </div>

        </div>

        <hr style="margin:18px 0">

        <h3>PREVIOUS SHOP HISTORY</h3>

        ${historyHTML}
    `;

    openModal("historyModal");
}


/* =========================================================
   MODAL OUTSIDE CLICK
========================================================= */

["moveModal", "historyModal"].forEach(id => {

    $(id).addEventListener("click", event => {

        if (event.target.id === id) {
            closeModal(id);
        }
    });

});


/* =========================================================
   INITIAL DEFAULT DATE
========================================================= */

$("datePlaced").value = today();

$("moveDate").value = today();


/* =========================================================
   END OF COACH-STOCK.JS V2.0 FINAL
========================================================= */
