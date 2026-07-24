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