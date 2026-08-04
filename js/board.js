/* ==========================================================
   MR CO-ORDINATION BOARD
   board.js
   Production Ready
   PART 1
========================================================== */

import {
    listenBoard
} from "./firebase-board.js";

/* ==========================================================
   GLOBAL VARIABLES
========================================================== */

let boardData = {};
let currentCell = null;
let unsubscribeBoard = null;

/* ==========================================================
   BOOTSTRAP MODAL
========================================================== */

const coachModal = new bootstrap.Modal(
    document.getElementById("coachModal")
);

/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeBoard();

});

/* ==========================================================
   INITIALIZE BOARD
========================================================== */

function initializeBoard() {

    startClock();

    bindButtons();

    subscribeBoard();

    updateCounters();

    updateConnectionStatus(
        navigator.onLine
    );

    console.log(
        "MR CO-ORDINATION BOARD INITIALIZED"
    );

}

/* ==========================================================
   FIREBASE LISTENER
========================================================== */

function subscribeBoard() {

    if (unsubscribeBoard) {

        unsubscribeBoard();

    }

    unsubscribeBoard = listenBoard(data => {

        boardData = data || {};

        renderBoard();

        updateCounters();

        updateLastUpdate();

    });

}

/* ==========================================================
   LIVE CLOCK
========================================================== */

function startClock() {

    refreshClock();

    setInterval(refreshClock, 1000);

}

function refreshClock() {

    const now = new Date();

    document.getElementById("liveDate").textContent =
        now.toLocaleDateString("en-IN");

    document.getElementById("liveTime").textContent =
        now.toLocaleTimeString("en-IN");

}

/* ==========================================================
   LAST UPDATE
========================================================== */

function updateLastUpdate() {

    const el =
        document.getElementById("lastUpdate");

    if (!el) return;

    el.textContent =
        "Updated : " +
        new Date().toLocaleTimeString("en-IN");

}

/* ==========================================================
   RENDER BOARD
========================================================== */

function renderBoard() {

    clearBoard();

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach =
                boardData[line][position];

            if (!coach) return;

            const cell =
                document.getElementById(
                    `${line}_${position}`
                );

            if (!cell) return;

            drawCoach(
                cell,
                line,
                position,
                coach
            );

        });

    });

    applyStatusColours();

}

/* ==========================================================
   DRAW COACH
========================================================== */

function drawCoach(
    cell,
    line,
    position,
    coach
) {

    cell.dataset.shop =
        coach.shop || "";

    cell.dataset.line =
        line;

    cell.dataset.position =
        position;

    cell.dataset.coach =
        coach.coachNo || "";

    cell.dataset.type =
        coach.coachType || "";

    cell.dataset.status =
        coach.status || "";

    cell.innerHTML = `
        <div class="coach-card">
            <div class="coach-no">
                ${coach.coachNo}
            </div>

            <div class="coach-type">
                ${coach.coachType}
            </div>

            <div class="coach-status">
                ${coach.status}
            </div>
        </div>
    `;

}

/* ==========================================================
   CLEAR BOARD
========================================================== */

function clearBoard() {

    document
        .querySelectorAll(".coach-table td")
        .forEach(td => {

            td.innerHTML = "";

            td.dataset.shop = "";
            td.dataset.line = "";
            td.dataset.position = "";
            td.dataset.coach = "";
            td.dataset.type = "";
            td.dataset.status = "";

        });

}

/* ==========================================================
   BUTTONS
========================================================== */

function bindButtons() {

    document
        .getElementById("refreshBtn")
        ?.addEventListener(
            "click",
            renderBoard
        );

    document
        .getElementById("pdfBtn")
        ?.addEventListener(
            "click",
            () => window.print()
        );

}

/* ==========================================================
   AUTO REFRESH
========================================================== */

setInterval(() => {

    updateCounters();

}, 3000);

console.log(
    "board.js Part 1 Loaded"
);



/* ==========================================================
   PART 2
   CELL CLICK + MODAL
========================================================== */

function enableCellClick() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.addEventListener("click", () => {

            currentCell = cell;

            document.getElementById("modalShop").value =
                cell.dataset.shop || "";

            document.getElementById("modalLine").value =
                cell.dataset.line || "";

            document.getElementById("modalPosition").value =
                cell.dataset.position || "";

            document.getElementById("modalCoachNo").value =
                cell.dataset.coach || "";

            document.getElementById("modalCoachType").value =
                cell.dataset.type || "";

            document.getElementById("modalStatus").value =
                cell.dataset.status || "PO";

            coachModal.show();

        });

    });

}

/* ==========================================================
   GET MODAL DATA
========================================================== */

function getModalData() {

    return {

        shop:
            document.getElementById("modalShop").value.trim(),

        line:
            document.getElementById("modalLine").value.trim(),

        position:
            document.getElementById("modalPosition").value.trim(),

        coachNo:
            document.getElementById("modalCoachNo").value
            .trim()
            .toUpperCase(),

        coachType:
            document.getElementById("modalCoachType").value,

        status:
            document.getElementById("modalStatus").value

    };

}

/* ==========================================================
   RESET MODAL
========================================================== */

function resetModal() {

    document.getElementById("modalCoachNo").value = "";

    document.getElementById("modalCoachType").selectedIndex = 0;

    document.getElementById("modalStatus").selectedIndex = 0;

}

/* ==========================================================
   CLOSE MODAL
========================================================== */

function closeModal() {

    resetModal();

    coachModal.hide();

}

/* ==========================================================
   AUTO FOCUS
========================================================== */

document
.getElementById("coachModal")
?.addEventListener("shown.bs.modal", () => {

    document
    .getElementById("modalCoachNo")
    ?.focus();

});

/* ==========================================================
   INPUT FORMAT
========================================================== */

document
.getElementById("modalCoachNo")
?.addEventListener("input", function () {

    this.value = this.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

});

/* ==========================================================
   ESC KEY CLOSE
========================================================== */

document.addEventListener("keydown", e => {

    if (e.key === "Escape") {

        closeModal();

    }

});


/* ==========================================================
   PART 3
   SAVE • UPDATE • DELETE
========================================================== */

import {
    saveCoach as firebaseSaveCoach,
    updateCoach as firebaseUpdateCoach,
    deleteCoach as firebaseDeleteCoach,
    duplicateCoach
} from "./firebase-board.js";

/* ==========================================================
   SAVE COACH
========================================================== */

async function saveCoach() {

    try {

        const coach = getModalData();

        if (!coach.line || !coach.position) {
            alert("Invalid Location");
            return;
        }

        if (!coach.coachNo) {
            alert("Enter Coach Number");
            return;
        }

        if (await duplicateCoach(coach.coachNo)) {
            alert("Coach Number Already Exists");
            return;
        }

        await firebaseSaveCoach(coach);

        coachModal.hide();

    } catch (err) {

        console.error(err);
        alert(err.message || "Save Failed");

    }

}

/* ==========================================================
   UPDATE COACH
========================================================== */

async function updateCoach() {

    try {

        const coach = getModalData();

        if (!coach.coachNo) {
            alert("Enter Coach Number");
            return;
        }

        await firebaseUpdateCoach(coach);

        coachModal.hide();

    } catch (err) {

        console.error(err);
        alert(err.message || "Update Failed");

    }

}

/* ==========================================================
   DELETE COACH
========================================================== */

async function deleteCoach() {

    try {

        if (!confirm("Delete this coach?")) return;

        const coach = getModalData();

        await firebaseDeleteCoach(
            coach.line,
            coach.position
        );

        coachModal.hide();

    } catch (err) {

        console.error(err);
        alert(err.message || "Delete Failed");

    }

}

/* ==========================================================
   BUTTON EVENTS
========================================================== */

document
.getElementById("saveCoachBtn")
?.addEventListener("click", saveCoach);

document
.getElementById("updateCoachBtn")
?.addEventListener("click", updateCoach);

document
.getElementById("deleteCoachBtn")
?.addEventListener("click", deleteCoach);

/* ==========================================================
   ENTER KEY SUPPORT
========================================================== */

document
.getElementById("modalCoachNo")
?.addEventListener("keydown", e => {

    if (e.key === "Enter") {

        e.preventDefault();

        saveCoach();

    }

});
