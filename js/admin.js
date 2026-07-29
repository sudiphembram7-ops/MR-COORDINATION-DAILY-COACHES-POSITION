/* ==========================================
 ADMIN PANEL
   admin.js
========================================== */
console.log("admin.js loaded");
import { database } from "./firebase-config.js";
import {
    saveCoach as firebaseSaveCoach,
    updateCoach as firebaseUpdateCoach,
    deleteCoach as firebaseDeleteCoach,
    listenBoard
} from "./firebase-admin.js";

function loadCoachData() {
    listenBoard((data) => {
        renderHistory(data);
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
        coachNo: document.getElementById("coachNo").value.trim(),
        coachType: document.getElementById("coachType").value,
        status: document.getElementById("status").value,
        updatedAt: new Date().toISOString()
    };

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

    try {

        await firebaseSaveCoach(coach);

        await writeAudit("SAVE", coach);

        alert("Coach Saved Successfully");

        clearForm();

    } catch (e) {

        console.error(e);

        alert(e.message);

    }

}
/* ==========================================
   UPDATE
========================================== */

async function updateCoach() {

    const coach = getFormData();

    try {

        await firebaseUpdateCoach(coach);

        await writeAudit("UPDATE", coach);

        alert("Coach Updated Successfully");

        clearForm();

    } catch (err) {

        console.error(err);

        alert("Update Failed");

    }

}

/* ==========================================
   DELETE
========================================== */
async function deleteCoach() {

    const coach = getFormData();

    try {

        await firebaseDeleteCoach(coach.line, coach.position);

        await writeAudit("DELETE", coach);

        alert("Deleted Successfully");

        clearForm();

    } catch (err) {

        console.error(err);

        alert("Delete Failed");

    }
}
/* ==========================================
   CLEAR FORM
========================================== */

function clearForm() {
    document.getElementById("coachNo").value = "";
    document.getElementById("coachType").value = "";
}

/* ==========================================
   HISTORY TABLE
========================================== */

function addHistoryRow(data) {

    const table =
        document.getElementById("historyTable");

    if (!table) return;

    const row = table.insertRow(0);

    row.insertCell(0).innerText = data.shop;

    row.insertCell(1).innerText = data.line;

    row.insertCell(2).innerText = data.position;

    row.insertCell(3).innerText = data.coachNo;

    row.insertCell(4).innerText = data.status;

    row.insertCell(5).innerText =
        new Date().toLocaleString("en-IN");

}
/* ==========================================
   LOAD BOARD DATA FROM FIREBASE
========================================== */

import {
    ref,
    onValue,
    get,
    push
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================================
   RENDER HISTORY TABLE
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
                <td>${coach.updatedAt || ""}</td>
            `;
        });

    });

}
/* ==========================================
   EDIT COACH
========================================== */

window.editCoach = function(line, position) {

    get(ref(database, "coachBoard/" + line + "/" + position))

    .then((snapshot) => {

        if (!snapshot.exists()) return;

        const coach = snapshot.val();

        document.getElementById("shop").value = coach.shop;

        document.getElementById("line").value = line;

        document.getElementById("position").value = position;

        document.getElementById("coachNo").value = coach.coachNo;
document.getElementById("coachType").value = coach.coachType || "";
        document.getElementById("status").value = coach.status;

    });

};

/* ==========================================
   SEARCH HISTORY
========================================== */

const searchBox = document.getElementById("searchCoach");

if (searchBox) {

    searchBox.addEventListener("keyup", function () {

        const value = this.value.toUpperCase();

        document.querySelectorAll("#historyTable tr")

        .forEach(row => {

            row.style.display = row.innerText
                .toUpperCase()
                .includes(value)
                ? ""
                : "none";

        });

    });

}

/* ==========================================
   FILTER SHOP
========================================== */

const shopFilter = document.getElementById("shopFilter");

if (shopFilter) {

    shopFilter.addEventListener("change", function () {

        const value = this.value.toUpperCase();

        document.querySelectorAll("#historyTable tr")

        .forEach(row => {

            if (value === "ALL") {

                row.style.display = "";

                return;

            }

            row.style.display = row.cells[0].innerText
                .toUpperCase() === value
                ? ""
                : "none";

        });

    });

}

/* ==========================================
   START
========================================== */
document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("saveBtn")?.addEventListener("click", saveCoach);
    document.getElementById("updateBtn")?.addEventListener("click", updateCoach);
    document.getElementById("deleteBtn")?.addEventListener("click", deleteCoach);

    loadCoachData();

});


/* ==========================================
   ADMIN AUTH CHECK
========================================== */

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "login.html";
        return;

    }

    const adminName = document.getElementById("adminName");

    if (adminName) {

        adminName.textContent =
            user.email;

    }

});

/* ==========================================
   LOGOUT
========================================== */

const logoutBtn =
    document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.onclick = async () => {

        await signOut(auth);

    };

}

/* ==========================================
   AUDIT LOG
========================================== */



async function writeAudit(action, coach) {

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

}

/* ==========================================
   MODIFY SAVE FUNCTION
========================================== */



/* ==========================================
   MODIFY DELETE FUNCTION
========================================== */



/* ==========================================
   DASHBOARD COUNTERS
========================================== */

function updateDashboardStats() {

    const rows =
        document.querySelectorAll(
            "#historyTable tr"
        );

    document.getElementById("totalEntry").textContent =
        rows.length;

    let po = 0;

    let lm = 0;

    let med = 0;
    let rl = 0;
    let r1 = 0;

    rows.forEach(r => {

        if (r.cells.length < 5) return;

const s = r.cells[5].innerText;

        if (s === "PO") po++;

        if (s === "LM") lm++;

        if (s === "MED") med++;
        
        if (s=== "RL") med++;
        
        if (s=== "R1") r1++;

    });

    document.getElementById("poCount").textContent = po;

    document.getElementById("lmCount").textContent = lm;

    document.getElementById("medCount").textContent = med;

}

setInterval(updateDashboardStats, 2000);

/* ==========================================
   EXPORT CSV
========================================== */

const exportBtn =
    document.getElementById("exportHistory");

if (exportBtn) {

    exportBtn.onclick = () => {

           let csv =
"Shop,Line,Position,Coach,Coach Type,Status,Time\n";

        document
            .querySelectorAll("#historyTable tr")

            .forEach(row => {

                let cols = [];

                row.querySelectorAll("td")

                    .forEach(td => {

                        cols.push(
                            td.innerText
                        );

                    });

                csv += cols.join(",") + "\n";

            });

        const blob =
            new Blob([csv]);

        const a =
            document.createElement("a");

        a.href =
            URL.createObjectURL(blob);

        a.download =
            "CoachHistory.csv";

        a.click();

    };

}

