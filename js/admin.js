/* ==========================================
   MR CO-ORDINATION ADMIN PANEL
   admin.js
========================================== */

import {
    ref,
    set,
    get,
    child,
    remove
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("saveBtn")
        .addEventListener("click", saveCoach);

    document
        .getElementById("updateBtn")
        .addEventListener("click", updateCoach);

    document
        .getElementById("deleteBtn")
        .addEventListener("click", deleteCoach);

});

/* ==========================================
   GET FORM DATA
========================================== */

function getFormData() {

    return {

        shop: document.getElementById("shop").value,

        line: document.getElementById("line").value,

        position: document.getElementById("position").value,

        coachNo: document.getElementById("coachNo").value.trim(),

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

        await set(

            ref(database,
                "coachBoard/" +
                coach.line +
                "/" +
                coach.position
            ),

            {

                coachNo: coach.coachNo,

                status: coach.status,

                shop: coach.shop,

                updatedAt: coach.updatedAt

            }

        );

        alert("Coach Saved Successfully");

        addHistoryRow(coach);

        clearForm();

    }

    catch (err) {

        console.error(err);

        alert("Save Failed");

    }

}

/* ==========================================
   UPDATE
========================================== */

async function updateCoach() {

    await saveCoach();

}

/* ==========================================
   DELETE
========================================== */

async function deleteCoach() {

    const coach = getFormData();

    try {

        await remove(

            ref(

                database,

                "coachBoard/" +
                coach.line +
                "/" +
                coach.position

            )

        );

        alert("Deleted");

    }

    catch (err) {

        console.error(err);

    }

}

/* ==========================================
   CLEAR FORM
========================================== */

function clearForm() {

    document.getElementById("coachNo").value = "";

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
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

function loadCoachData() {

    const boardRef = ref(database, "coachBoard");

    onValue(boardRef, (snapshot) => {

        if (!snapshot.exists()) return;

        const data = snapshot.val();

        renderHistory(data);

    });

}

/* ==========================================
   RENDER HISTORY TABLE
========================================== */

function renderHistory(data) {

    const table = document.getElementById("historyTable");

    table.innerHTML = "";

    Object.keys(data).forEach(line => {

        Object.keys(data[line]).forEach(position => {

            const coach = data[line][position];

            const row = table.insertRow();

            row.innerHTML = `
                <td>${coach.shop || "-"}</td>
                <td>${line}</td>
                <td>${position}</td>
                <td>${coach.coachNo}</td>
                <td>${coach.status}</td>
                <td>${coach.updatedAt || "-"}</td>
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

    loadCoachData();

});