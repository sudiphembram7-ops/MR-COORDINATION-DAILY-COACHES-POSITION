/* ==========================================
   ADMIN PANEL
   admin.js
   PART - 1
========================================== */

console.log("admin.js loaded");

/* ==========================================
   IMPORTS
========================================== */

import { database } from "./firebase-config.js";

import {
    saveCoach as firebaseSaveCoach,
    updateCoach as firebaseUpdateCoach,
    deleteCoach as firebaseDeleteCoach,
    listenBoard
} from "./firebase-admin.js";

import {
    ref,
    get,
    push
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/* ==========================================
   FIREBASE AUTH
========================================== */

const auth = getAuth();

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const adminName = document.getElementById("adminName");

    if (adminName) {
        adminName.textContent = user.email;
    }

});

/* ==========================================
   LOAD BOARD
========================================== */

function loadCoachData() {

    listenBoard((data) => {

        renderHistory(data || {});
        updateDashboardStats();

    });

}

/* ==========================================
   GET FORM DATA
========================================== */

function getFormData() {

    return {

        shop: document.getElementById("shop").value,

        line: document.getElementById("line").value,

        position: document.getElementById("position").value,

        coachNo: document
            .getElementById("coachNo")
            .value
            .trim()
            .toUpperCase(),

        coachType: document
            .getElementById("coachType")
            .value,

        status: document
            .getElementById("status")
            .value,

        updatedAt: new Date().toISOString()

    };

}

/* ==========================================
   DUPLICATE CHECK
========================================== */

async function isDuplicateCoach(coachNo, line, position) {

    if (!coachNo) return false;

    const snapshot = await get(ref(database, "coachBoard"));

    if (!snapshot.exists()) return false;

    const board = snapshot.val();

    for (const l in board) {

        for (const p in board[l]) {

            const coach = board[l][p];

            if (!coach) continue;

            if (
                coach.coachNo === coachNo &&
                !(l === line && p === position)
            ) {
                return true;
            }

        }

    }

    return false;

}

/* ==========================================
   SAVE
========================================== */

async function saveCoach() {

    const coach = getFormData();

    if (!coach.coachNo) {

        alert("Enter Coach Number");
        return;

    }

    if (
        await isDuplicateCoach(
            coach.coachNo,
            coach.line,
            coach.position
        )
    ) {

        alert("Coach Number Already Exists");
        return;

    }

    const btn = document.getElementById("saveBtn");

    if (btn) btn.disabled = true;

    try {

        await firebaseSaveCoach(coach);

        await writeAudit("SAVE", coach);

        alert("Coach Saved Successfully");

        clearForm();

    } catch (err) {

        console.error(err);

        alert(err.message);

    } finally {

        if (btn) btn.disabled = false;

    }

}

/* ==========================================
   UPDATE
========================================== */

async function updateCoach() {

    const coach = getFormData();

    if (!coach.coachNo) {

        alert("Enter Coach Number");
        return;

    }

    const btn = document.getElementById("updateBtn");

    if (btn) btn.disabled = true;

    try {

        await firebaseUpdateCoach(coach);

        await writeAudit("UPDATE", coach);

        alert("Coach Updated Successfully");

        clearForm();

    } catch (err) {

        console.error(err);

        alert("Update Failed");

    } finally {

        if (btn) btn.disabled = false;

    }

}

/* ==========================================
   DELETE
========================================== */

async function deleteCoach() {

    const coach = getFormData();

    if (!confirm("Delete this coach?")) return;

    const btn = document.getElementById("deleteBtn");

    if (btn) btn.disabled = true;

    try {

        await firebaseDeleteCoach(
            coach.line,
            coach.position
        );

        await writeAudit("DELETE", coach);

        alert("Deleted Successfully");

        clearForm();

    } catch (err) {

        console.error(err);

        alert("Delete Failed");

    } finally {

        if (btn) btn.disabled = false;

    }

}

/* ==========================================
   CLEAR FORM
========================================== */

function clearForm() {

    document.getElementById("coachNo").value = "";

    document.getElementById("coachType").selectedIndex = 0;

    document.getElementById("status").value = "PO";

}

/* ==========================================
   ADMIN PANEL
   PART - 2
   HISTORY / EDIT / SEARCH / DASHBOARD
========================================== */

/* ==========================================
   RENDER HISTORY
========================================== */

function renderHistory(data) {

    const table = document.getElementById("historyTable");

    if (!table) return;

    table.innerHTML = "";

    if (!data) return;

    Object.keys(data).sort().forEach(line => {

        if (!data[line]) return;

        Object.keys(data[line]).sort().forEach(position => {

            const coach = data[line][position];

            if (!coach) return;

            const row = table.insertRow();

            row.innerHTML = `
                <td>${coach.shop || ""}</td>
                <td>${line}</td>
                <td>${position}</td>
                <td>${coach.coachNo || ""}</td>
                <td>${coach.coachType || ""}</td>
                <td>${coach.status || ""}</td>
                <td>
                    ${
                        coach.updatedAt
                        ? new Date(coach.updatedAt).toLocaleString("en-IN")
                        : ""
                    }
                </td>
                <td>
                    <button
                        class="btn btn-warning btn-sm"
                        onclick="editCoach('${line}','${position}')">
                        Edit
                    </button>
                </td>
            `;

        });

    });

}

/* ==========================================
   EDIT COACH
========================================== */

window.editCoach = async function (line, position) {

    try {

        const snapshot = await get(
            ref(database, `coachBoard/${line}/${position}`)
        );

        if (!snapshot.exists()) {

            alert("Coach Not Found");
            return;

        }

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
            coach.status || "PO";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (err) {

        console.error(err);

        alert("Unable to Load Coach");

    }

};

/* ==========================================
   SEARCH
========================================== */

const searchBox =
document.getElementById("searchCoach");

if (searchBox) {

    searchBox.addEventListener("keyup", function () {

        const value =
        this.value.trim().toUpperCase();

        document
        .querySelectorAll("#historyTable tr")
        .forEach(row => {

            row.style.display =
                row.innerText
                .toUpperCase()
                .includes(value)
                ? ""
                : "none";

        });

        updateDashboardStats();

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

        document
        .querySelectorAll("#historyTable tr")
        .forEach(row => {

            if (value === "ALL") {

                row.style.display = "";
                return;

            }

            row.style.display =
                row.cells[0].innerText
                .toUpperCase() === value
                ? ""
                : "none";

        });

        updateDashboardStats();

    });

}

/* ==========================================
   DASHBOARD COUNTERS
========================================== */

function updateDashboardStats() {

    const rows =
        Array.from(
            document.querySelectorAll("#historyTable tr")
        ).filter(r => r.style.display !== "none");

    document.getElementById("totalEntry").textContent =
        rows.length;

    let po = 0;
    let s = 0;
    let lm = 0;
    let med = 0;
    let rl = 0;
    let r1 = 0;
    let rs = 0;
    let l = 0;
    let hvy = 0;

    rows.forEach(row => {

        if (row.cells.length < 6) return;

        const status =
            row.cells[5].innerText.trim().toUpperCase();

        switch (status) {

            case "PO":
                po++;
                break;

            case "S":
                s++;
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

            case "RS":
                rs++;
                break;

            case "L":
                l++;
                break;

            case "HVY":
                hvy++;
                break;

        }

    });

    document.getElementById("poCount") &&
        (document.getElementById("poCount").textContent = po);

    document.getElementById("sCount") &&
        (document.getElementById("sCount").textContent = s);

    document.getElementById("lmCount") &&
        (document.getElementById("lmCount").textContent = lm);

    document.getElementById("medCount") &&
        (document.getElementById("medCount").textContent = med);

    document.getElementById("rlCount") &&
        (document.getElementById("rlCount").textContent = rl);

    document.getElementById("r1Count") &&
        (document.getElementById("r1Count").textContent = r1);

    document.getElementById("rsCount") &&
        (document.getElementById("rsCount").textContent = rs);

    document.getElementById("lCount") &&
        (document.getElementById("lCount").textContent = l);

    document.getElementById("hvyCount") &&
        (document.getElementById("hvyCount").textContent = hvy);

}

/* ==========================================
   ADMIN PANEL
   PART - 3
   AUDIT / LOGOUT / EXPORT / START
========================================== */

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
                user: auth.currentUser?.email || "Unknown",
                time: new Date().toISOString()
            }
        );

    } catch (err) {

        console.error("Audit Error :", err);

    }

}

/* ==========================================
   LOGOUT
========================================== */

const logoutBtn =
document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        try {

            await signOut(auth);

            window.location.href = "login.html";

        } catch (err) {

            console.error(err);

            alert("Logout Failed");

        }

    });

}

/* ==========================================
   EXPORT CSV
========================================== */

const exportBtn =
document.getElementById("exportHistory");

if (exportBtn) {

    exportBtn.addEventListener("click", () => {

        let csv =
`Shop,Line,Position,Coach No,Coach Type,Status,Updated Time
`;

        document
        .querySelectorAll("#historyTable tr")
        .forEach(row => {

            const cols = [];

            row.querySelectorAll("td").forEach(td => {

                cols.push(`"${td.innerText.replace(/\n/g," ")}"`);

            });

            csv += cols.join(",") + "\n";

        });

        const blob =
        new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const link =
        document.createElement("a");

        link.href =
        URL.createObjectURL(blob);

        link.download =
        "MR_Coach_History.csv";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

    });

}

/* ==========================================
   BUTTON EVENTS
========================================== */

document
.getElementById("saveBtn")
?.addEventListener("click", saveCoach);

document
.getElementById("updateBtn")
?.addEventListener("click", updateCoach);

document
.getElementById("deleteBtn")
?.addEventListener("click", deleteCoach);

/* ==========================================
   START
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    loadCoachData();

    updateDashboardStats();

    console.log("MR Admin Panel Ready");

});

/* ==========================================
   AUTO REFRESH DASHBOARD
========================================== */

listenBoard((data) => {

    renderHistory(data || {});

    updateDashboardStats();

});

/* ==========================================
   END OF FILE
========================================== */