/* ==========================================
   MR CO-ORDINATION ADMIN PANEL
   admin.js
   PART - 1
========================================== */

console.log("admin.js loaded");

import { database, auth } from "./firebase-config.js";

import {
    saveCoach as firebaseSaveCoach,
    updateCoach as firebaseUpdateCoach,
    deleteCoach as firebaseDeleteCoach,
    listenBoard
} from "./firebase-admin.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/* ==========================================
   DOM ELEMENTS
========================================== */

const shop = document.getElementById("shop");
const line = document.getElementById("line");
const position = document.getElementById("position");
const coachNo = document.getElementById("coachNo");
const coachType = document.getElementById("coachType");
const status = document.getElementById("status");

const saveBtn = document.getElementById("saveBtn");
const updateBtn = document.getElementById("updateBtn");
const deleteBtn = document.getElementById("deleteBtn");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

const historyBody = document.getElementById("historyBody");

/* ==========================================
   VARIABLES
========================================== */

let boardData = {};
let selectedCoachKey = null;

/* ==========================================
   AUTH CHECK
========================================== */

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    console.log("Login Success :", user.email);

});

/* ==========================================
   INITIAL LOAD
========================================== */

loadCoachData();

/* ==========================================
   EVENT LISTENERS
========================================== */

saveBtn?.addEventListener("click", saveCoach);

updateBtn?.addEventListener("click", updateCoach);

deleteBtn?.addEventListener("click", deleteCoach);

refreshBtn?.addEventListener("click", () => {

    loadCoachData();

});

logoutBtn?.addEventListener("click", async () => {

    if (!confirm("Are you sure you want to logout?")) return;

    await signOut(auth);

    window.location.href = "login.html";

});

/* ==========================================
   SAVE COACH
========================================== */

async function saveCoach() {

    const coach = {
        shop: shop.value.trim(),
        line: line.value.trim(),
        position: position.value.trim(),
        coachNo: coachNo.value.trim().toUpperCase(),
        coachType: coachType.value.trim(),
        status: status.value.trim(),
        lastUpdated: new Date().toISOString()
    };

    /* ---------- Validation ---------- */

    if (
        !coach.shop ||
        !coach.line ||
        !coach.position ||
        !coach.coachNo ||
        !coach.coachType ||
        !coach.status
    ) {

        alert("Please fill all fields.");
        return;

    }

    /* ---------- Duplicate Check ---------- */

    let duplicate = false;

    Object.keys(boardData).forEach((key) => {

        const item = boardData[key];

        if (
            item.coachNo === coach.coachNo &&
            key !== selectedCoachKey
        ) {

            duplicate = true;

        }

    });

    if (duplicate) {

        alert("Coach Number already exists.");
        return;

    }

    /* ---------- Save ---------- */

    try {

        await firebaseSaveCoach(coach);

        alert("Coach saved successfully.");

        clearForm();

        loadCoachData();

        const modal = bootstrap.Modal.getInstance(
            document.getElementById("coachModal")
        );

        if (modal) modal.hide();

    }

    catch (error) {

        console.error(error);

        alert("Save failed.");

    }

}

/* ==========================================
   UPDATE COACH
========================================== */

async function updateCoach() {

    if (!selectedCoachKey) {

        alert("Please select a coach first.");
        return;

    }

    const coach = {

        shop: shop.value.trim(),
        line: line.value.trim(),
        position: position.value.trim(),
        coachNo: coachNo.value.trim().toUpperCase(),
        coachType: coachType.value.trim(),
        status: status.value.trim(),
        lastUpdated: new Date().toISOString()

    };

    /* ---------- Validation ---------- */

    if (
        !coach.shop ||
        !coach.line ||
        !coach.position ||
        !coach.coachNo ||
        !coach.coachType ||
        !coach.status
    ) {

        alert("Please fill all fields.");
        return;

    }

    /* ---------- Duplicate Check ---------- */

    let duplicate = false;

    Object.keys(boardData).forEach((key) => {

        if (key === selectedCoachKey) return;

        const item = boardData[key];

        if (item.coachNo === coach.coachNo) {

            duplicate = true;

        }

    });

    if (duplicate) {

        alert("Coach Number already exists.");
        return;

    }

    /* ---------- Update ---------- */

    try {

        await firebaseUpdateCoach(selectedCoachKey, coach);

        alert("Coach updated successfully.");

        clearForm();

        selectedCoachKey = null;

        loadCoachData();

        const modalElement = document.getElementById("coachModal");

        const modal = bootstrap.Modal.getInstance(modalElement);

        if (modal) modal.hide();

    } catch (error) {

        console.error("Update Error:", error);

        alert("Update failed.");

    }

}


/* ==========================================
   DELETE COACH
========================================== */

async function deleteCoach() {

    if (!selectedCoachKey) {

        alert("Please select a coach first.");
        return;

    }

    const ok = confirm(
        "Are you sure you want to delete this coach?"
    );

    if (!ok) return;

    try {

        await firebaseDeleteCoach(selectedCoachKey);

        alert("Coach deleted successfully.");

        clearForm();

        selectedCoachKey = null;

        loadCoachData();

        const modalElement =
            document.getElementById("coachModal");

        const modal =
            bootstrap.Modal.getInstance(modalElement);

        if (modal) {

            modal.hide();

        }

    }

    catch (error) {

        console.error("Delete Error:", error);

        alert("Delete failed.");

    }

}

/* ==========================================
   CLEAR FORM
========================================== */

function clearForm() {

    shop.value = "";
    line.innerHTML =
        '<option value="">Select Line</option>';

    position.innerHTML =
        '<option value="">Select Position</option>';

    coachNo.value = "";
    coachType.value = "";
    status.value = "";

    selectedCoachKey = null;

}

/* ==========================================
   LOAD COACH DATA
========================================== */

function loadCoachData() {

    listenBoard((data) => {

        boardData = data || {};

        renderHistory(boardData);

    });

}

/* ==========================================
   RENDER HISTORY TABLE
========================================== */

function renderHistory(data) {

    historyBody.innerHTML = "";

    Object.keys(data).forEach((key) => {

        const coach = data[key];

        const tr = document.createElement("tr");

        tr.innerHTML = `

            <td>${coach.shop || ""}</td>

            <td>${coach.line || ""}</td>

            <td>${coach.position || ""}</td>

            <td>
                <strong>${coach.coachNo || ""}</strong>
            </td>

            <td>${coach.coachType || ""}</td>

            <td>

                <span class="badge bg-primary">

                    ${coach.status || ""}

                </span>

            </td>

            <td>

                <button
                    class="btn btn-warning btn-sm editBtn"
                    data-key="${key}">

                    Edit

                </button>

            </td>

        `;

        historyBody.appendChild(tr);

    });

    bindEditButtons();

}

/* ==========================================
   EDIT BUTTON
========================================== */

function bindEditButtons() {

    document.querySelectorAll(".editBtn").forEach((btn) => {

        btn.addEventListener("click", () => {

            const key = btn.dataset.key;

            const coach = boardData[key];

            if (!coach) return;

            selectedCoachKey = key;

            shop.value = coach.shop || "";

            line.value = coach.line || "";

            position.value = coach.position || "";

            coachNo.value = coach.coachNo || "";

            coachType.value = coach.coachType || "";

            status.value = coach.status || "";

            const modal = new bootstrap.Modal(
                document.getElementById("coachModal")
            );

            modal.show();

        });

    });

}

/* ==========================================
   SHOP → LINE → POSITION
========================================== */

const shopConfig = {

    "N SHOP": {
        lines: ["A", "B", "C", "D"],
        positions: 12
    },

    "M SHOP": {
        lines: ["A", "B", "C", "D"],
        positions: 12
    },

    "MR SCR SHOP": {
        lines: ["1", "2", "3"],
        positions: 10
    },

    "CR SHOP": {
        lines: ["1", "2"],
        positions: 10
    },

    "J SHOP": {
        lines: ["A", "B"],
        positions: 10
    },

    "LIFTING BAY": {
        lines: ["BAY"],
        positions: 20
    }

};

/* ==========================================
   LOAD LINES
========================================== */

shop.addEventListener("change", () => {

    line.innerHTML =
        '<option value="">Select Line</option>';

    position.innerHTML =
        '<option value="">Select Position</option>';

    const config = shopConfig[shop.value];

    if (!config) return;

    config.lines.forEach((item) => {

        const option = document.createElement("option");

        option.value = item;
        option.textContent = item;

        line.appendChild(option);

    });

});

/* ==========================================
   LOAD POSITIONS
========================================== */

line.addEventListener("change", () => {

    position.innerHTML =
        '<option value="">Select Position</option>';

    const config = shopConfig[shop.value];

    if (!config) return;

    for (let i = 1; i <= config.positions; i++) {

        const option = document.createElement("option");

        option.value = i;
        option.textContent = i;

        position.appendChild(option);

    }

});

/* ==========================================
   REFRESH
========================================== */

refreshBtn?.addEventListener("click", () => {

    loadCoachData();

});

/* ==========================================
   MODAL RESET
========================================== */

document
.getElementById("coachModal")
.addEventListener("hidden.bs.modal", () => {

    clearForm();

});

/* ==========================================
   AUTO LOAD
========================================== */

loadCoachData();

/* ==========================================
   END
========================================== */

console.log("admin.js loaded successfully.");