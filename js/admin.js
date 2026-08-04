/* ==========================================
   MR CO-ORDINATION ADMIN PANEL
   admin.js - Part 1
========================================== */

/* ==========================================
   IMPORTS
========================================== */

import { auth, database } from "./firebase-config.js";
import { enableDragDrop } from "./dragdrop.js";
import {
    ref,
    get,
    push
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    saveCoach as firebaseSaveCoach,
    updateCoach as firebaseUpdateCoach,
    deleteCoach as firebaseDeleteCoach,
    listenBoard
} from "./firebase-board.js";

/* ==========================================
   GLOBAL VARIABLES
========================================== */

let boardData = {};
let currentUser = null;

/* ==========================================
   ADMIN AUTH CHECK
========================================== */

onAuthStateChanged(auth, (user) => {

    if (!user) {

        alert("Please Login First");

        window.location.href = "login.html";

        return;

    }

    currentUser = user;

    console.log("Admin Login :", user.email);

    console.log("UID :", user.uid);

    const adminName =
        document.getElementById("adminName");

    if (adminName) {

        adminName.textContent = user.email;

    }

    loadCoachData();
enableDragDrop();
});
/* ==========================================
   DOM READY
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("saveBtn")
        ?.addEventListener("click", saveCoach);

    document
        .getElementById("updateBtn")
        ?.addEventListener("click", updateCoach);

    document
        .getElementById("deleteBtn")
        ?.addEventListener("click", deleteCoach);

});

/* ==========================================
   LOAD BOARD
========================================== */

function loadCoachData() {

    listenBoard((data) => {

        boardData = data || {};

        renderHistory(boardData);

        updateDashboardStats();

    });

}

/* ==========================================
   admin.js - Part 2
   FORM • SAVE • UPDATE • DELETE • AUDIT
========================================== */

/* ==========================================
   GET FORM DATA
========================================== */

function getFormData() {

    return {

        shop: document.getElementById("shop").value,

        line: document.getElementById("line").value,

        position: document.getElementById("position").value,

        coachNo: document.getElementById("coachNo").value.trim().toUpperCase(),

        coachType: document.getElementById("coachType").value,

        status: document.getElementById("status").value,

        updatedAt: new Date().toISOString()

    };

}

/* ==========================================
   CLEAR FORM
========================================== */

function clearForm() {

    document.getElementById("shop").selectedIndex = 0;
    document.getElementById("line").selectedIndex = 0;
    document.getElementById("position").selectedIndex = 0;
    document.getElementById("coachNo").value = "";
    document.getElementById("coachType").selectedIndex = 0;
    document.getElementById("status").selectedIndex = 0;

}

/* ==========================================
   SAVE COACH
========================================== */

async function saveCoach() {

    const coach = getFormData();

    if (!coach.coachNo) {

        alert("Enter Coach Number");

        return;

    }

    try {

        await firebaseSaveCoach(coach);

        await writeAudit("SAVE", coach);

        alert("Coach Saved Successfully");

        clearForm();

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}

/* ==========================================
   UPDATE COACH
========================================== */

async function updateCoach() {

    const coach = getFormData();

    if (!coach.coachNo) {

        alert("Enter Coach Number");

        return;

    }

    try {

        await firebaseUpdateCoach(coach);

        await writeAudit("UPDATE", coach);

        alert("Coach Updated Successfully");

        clearForm();

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}

/* ==========================================
   DELETE COACH
========================================== */

async function deleteCoach() {

    const coach = getFormData();

    if (!confirm("Delete this Coach?")) return;

    try {

        await firebaseDeleteCoach(
            coach.line,
            coach.position
        );

        await writeAudit("DELETE", coach);

        alert("Coach Deleted Successfully");

        clearForm();

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}

/* ==========================================
   AUDIT LOG
========================================== */

async function writeAudit(action, coach) {

    try {

        await push(

            ref(database, "auditLog"),

            {

                action,

                shop: coach.shop,

                line: coach.line,

                position: coach.position,

                coachNo: coach.coachNo,

                coachType: coach.coachType,

                status: coach.status,

                user: currentUser.email,

                uid: currentUser.uid,

                time: new Date().toISOString()

            }

        );

    } catch (error) {

        console.error("Audit Error :", error);

    }

}

/* ==========================================
   admin.js - Part 3
   EDIT • HISTORY • SEARCH • FILTER • DASHBOARD
========================================== */

/* ==========================================
   EDIT COACH
========================================== */

window.editCoach = async function (line, position) {

    try {

        const snapshot = await get(
            ref(database, `coachBoard/${line}/${position}`)
        );

        if (!snapshot.exists()) return;

        const coach = snapshot.val();

        document.getElementById("shop").value =
            coach.shop || "";

        document.getElementById("line").value =
            line;

        document.getElementById("position").value =
            position;

        document.getElementById("coachNo").value =
            coach.coachNo || "";

        document.getElementById("coachType").value =
            coach.coachType || "";

        document.getElementById("status").value =
            coach.status || "";

    } catch (error) {

        console.error(error);

        alert("Unable to load coach.");

    }

};

/* ==========================================
   HISTORY TABLE
========================================== */

function renderHistory(data) {

    const table = document.getElementById("historyTable");

    if (!table) return;

    table.innerHTML = "";

    Object.keys(data).forEach(line => {

        Object.keys(data[line]).forEach(position => {

            const coach = data[line][position];

            const row = table.insertRow();

            row.innerHTML = `
                <td>${coach.shop || ""}</td>
                <td>${line}</td>
                <td>${position}</td>
                <td>${coach.coachNo || ""}</td>
                <td>${coach.coachType || ""}</td>
                <td>${coach.status || ""}</td>
                <td>${
                    coach.updatedAt
                        ? new Date(coach.updatedAt).toLocaleString("en-IN")
                        : ""
                }</td>
                <td>
                    <button class="btn btn-sm btn-primary"
                        onclick="editCoach('${line}','${position}')">
                        Edit
                    </button>
                </td>
            `;

        });

    });

}

/* ==========================================
   SEARCH
========================================== */

const searchBox =
    document.getElementById("searchCoach");

if (searchBox) {

    searchBox.addEventListener("keyup", function () {

        const value =
            this.value.toUpperCase();

        document.querySelectorAll("#historyTable tr")
            .forEach(row => {

                row.style.display =
                    row.innerText.toUpperCase().includes(value)
                        ? ""
                        : "none";

            });

    });

}

/* ==========================================
   SHOP FILTER
========================================== */

const shopFilter =
    document.getElementById("shopFilter");

if (shopFilter) {

    shopFilter.addEventListener("change", function () {

        const value =
            this.value.toUpperCase();

        document.querySelectorAll("#historyTable tr")
            .forEach(row => {

                if (value === "ALL") {

                    row.style.display = "";

                    return;

                }

                row.style.display =
                    row.cells[0].innerText.toUpperCase() === value
                        ? ""
                        : "none";

            });

    });

}

/* ==========================================
   DASHBOARD COUNTERS
========================================== */

function updateDashboardStats() {

    const rows =
        document.querySelectorAll("#historyTable tr");

    
    let po = 0;
    let lm = 0;
    let med = 0;
    let rl = 0;
    let r1 = 0;

    rows.forEach(row => {

        if (row.cells.length < 6) return;

        const status =
            row.cells[5].innerText.trim().toUpperCase();

        switch (status) {

            case "PO":
                po++;
                break;

            case "LM":
                lm++;
                break;

            case "MED":
                med++;
                break;

            case "RL":
                rl++;
                break;

            case "R1":
                r1++;
                break;

        }

    });
const totalEntry = document.getElementById("totalEntry");
if (totalEntry) totalEntry.textContent = rows.length;
    const poCount = document.getElementById("poCount");
if (poCount) poCount.textContent = po;

const lmCount = document.getElementById("lmCount");
if (lmCount) lmCount.textContent = lm;

const medCount = document.getElementById("medCount");
if (medCount) medCount.textContent = med;

    const rlCount = document.getElementById("rlCount");
    if (rlCount) rlCount.textContent = rl;

    const r1Count = document.getElementById("r1Count");
    if (r1Count) r1Count.textContent = r1;

}

/* ==========================================
   admin.js - Part 4
   LOGOUT • REFRESH • AUTO REFRESH
========================================== */

/* ==========================================
   LOGOUT
========================================== */

window.logout = async function () {

    try {

        await signOut(auth);

        alert("Logout Successful");

        window.location.href = "login.html";

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

};

/* ==========================================
   REFRESH BUTTON
========================================== */

const refreshBtn =
    document.getElementById("refreshBtn");

if (refreshBtn) {

    refreshBtn.addEventListener("click", () => {

        renderHistory(boardData);
updateDashboardStats();
alert("Board Refreshed");

      

    });

}

/* ==========================================
   AUTO REFRESH
========================================== */



/* ==========================================
   LIVE CONNECTION STATUS
========================================== */

window.addEventListener("online", () => {
    console.log("Internet Connected");
});
window.addEventListener("offline", () => {

    alert("Internet Connection Lost");

});

/* ==========================================
   ADMIN DRAG & DROP
========================================== */





/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("MR CO-ORDINATION ADMIN READY");

});
